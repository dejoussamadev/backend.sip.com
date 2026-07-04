import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../notifications/email.service';
import { ErrorCatalogService } from '../../common/errors/error-catalog.service';
import { AppValidationException } from '../../common/errors/app-validation.exception';
import { getJwtSecret } from '../jwt-secret';

/** OTP lifetime and hardening parameters. */
const OTP_TTL_MS = 2 * 60 * 1000; // 2 minutes
const MAX_VERIFY_ATTEMPTS = 5;
const SALT_ROUNDS = 12;
const RESET_TOKEN_TTL = '10m';
const RESET_TOKEN_PURPOSE = 'password_reset';

/**
 * Reset tokens are signed with a secret derived from — but distinct from —
 * the access-token secret, so a reset token can never be replayed as an
 * `access_token` session cookie (the signatures won't match).
 */
const RESET_TOKEN_SECRET = `${getJwtSecret()}:password-reset`;

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly catalog: ErrorCatalogService,
  ) {}

  /**
   * Step 1 — issue a fresh OTP for the account and email it.
   * Any prior unconsumed OTP for the user is invalidated (resend kills the
   * previous code). Unknown / disabled accounts surface an explicit error.
   */
  async requestOtp(rawEmail: string): Promise<{ email: string }> {
    const email = rawEmail.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      this.logger.warn(`Password reset requested for unknown/disabled email ${email}`);
      throw AppValidationException.from(this.catalog, [
        { field: 'email', code: 'USER_EMAIL_NOT_FOUND' },
      ]);
    }

    // Invalidate any previous unconsumed codes for this user.
    await this.prisma.passwordResetOtp.deleteMany({
      where: { userId: user.id, consumedAt: null },
    });

    const code = String(randomInt(100000, 1000000)); // 6-digit, 100000–999999
    const codeHash = await bcrypt.hash(code, SALT_ROUNDS);

    await this.prisma.passwordResetOtp.create({
      data: {
        userId: user.id,
        codeHash,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    });

    await this.emailService.sendEmail('PASSWORD_RESET_OTP', [user.email], {
      userName: user.name,
      otpCode: code,
    });

    this.logger.log(`Password reset OTP issued for ${email}`);
    return { email };
  }

  /**
   * Step 2 — verify the OTP. On success the code is consumed and a short-lived
   * reset token is returned that authorises exactly one password change.
   */
  async verifyOtp(rawEmail: string, code: string): Promise<{ resetToken: string }> {
    const email = rawEmail.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      throw AppValidationException.from(this.catalog, [
        { field: 'email', code: 'USER_EMAIL_NOT_FOUND' },
      ]);
    }

    const otp = await this.prisma.passwordResetOtp.findFirst({
      where: { userId: user.id, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp || otp.expiresAt.getTime() < Date.now()) {
      throw AppValidationException.from(this.catalog, [
        { field: 'code', code: 'PASSWORD_RESET_OTP_EXPIRED' },
      ]);
    }

    if (otp.attempts >= MAX_VERIFY_ATTEMPTS) {
      throw AppValidationException.from(this.catalog, [
        { field: 'code', code: 'PASSWORD_RESET_OTP_MAX_ATTEMPTS' },
      ]);
    }

    const isValid = await bcrypt.compare(code, otp.codeHash);
    if (!isValid) {
      await this.prisma.passwordResetOtp.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw AppValidationException.from(this.catalog, [
        { field: 'code', code: 'PASSWORD_RESET_OTP_INVALID' },
      ]);
    }

    await this.prisma.passwordResetOtp.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });

    const resetToken = await this.jwtService.signAsync(
      { sub: user.id, purpose: RESET_TOKEN_PURPOSE },
      { secret: RESET_TOKEN_SECRET, expiresIn: RESET_TOKEN_TTL },
    );

    this.logger.log(`Password reset OTP verified for ${email}`);
    return { resetToken };
  }

  /**
   * Step 3 — consume the reset token and set the new password.
   */
  async resetPassword(resetToken: string, newPassword: string): Promise<{ success: boolean }> {
    let payload: { sub: number; purpose?: string };
    try {
      payload = await this.jwtService.verifyAsync(resetToken, {
        secret: RESET_TOKEN_SECRET,
      });
    } catch {
      throw AppValidationException.from(this.catalog, [
        { field: 'resetToken', code: 'PASSWORD_RESET_TOKEN_INVALID' },
      ]);
    }

    if (payload.purpose !== RESET_TOKEN_PURPOSE) {
      throw AppValidationException.from(this.catalog, [
        { field: 'resetToken', code: 'PASSWORD_RESET_TOKEN_INVALID' },
      ]);
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw AppValidationException.from(this.catalog, [
        { field: 'resetToken', code: 'PASSWORD_RESET_TOKEN_INVALID' },
      ]);
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Best-effort cleanup of any remaining codes for this user.
    await this.prisma.passwordResetOtp.deleteMany({ where: { userId: user.id } });

    this.logger.log(`Password reset completed for ${user.email}`);
    return { success: true };
  }
}

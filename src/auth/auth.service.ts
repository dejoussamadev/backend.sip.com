import {
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginRequestStatus, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Request } from 'express';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async login(loginDto: LoginDto, request: Request) {
    const email = loginDto.email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      this.logger.warn(`Failed login attempt for unknown email ${email}`);
      throw new UnauthorizedException('Email or password is incorrect');
    }

    if (!user.isActive) {
      this.logger.warn(`Disabled account login attempt for ${email}`);
      throw new ForbiddenException(
        'Your account is disabled. Please contact an administrator.',
      );
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

    if (!isPasswordValid) {
      this.logger.warn(`Invalid password for ${email}`);
      throw new UnauthorizedException('Email or password is incorrect');
    }

    if (user.role === 'ADMIN') {
      this.logger.log(`Admin login successful for ${email}`);
      return this.buildLoginResponse(user);
    }

    const trustedDevice = await this.prisma.trustedDevice.findUnique({
      where: {
        userId_fingerprint: {
          userId: user.id,
          fingerprint: loginDto.fingerprint,
        },
      },
    });

    if (!trustedDevice) {
      const existingPendingRequest = await this.prisma.loginRequest.findFirst({
        where: {
          userId: user.id,
          fingerprint: loginDto.fingerprint,
          status: LoginRequestStatus.PENDING,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (existingPendingRequest) {
        return {
          requiresApproval: true,
          status: existingPendingRequest.status,
          loginRequestId: existingPendingRequest.id,
          message: 'This device is awaiting admin approval.',
        };
      }

      const loginRequest = await this.prisma.loginRequest.create({
        data: {
          userId: user.id,
          fingerprint: loginDto.fingerprint,
          deviceName: loginDto.deviceName,
          browser: loginDto.browser,
          operatingSystem: loginDto.operatingSystem,
          platform: loginDto.platform,
          userAgent: this.resolveUserAgent(request),
          ipAddress: this.resolveIpAddress(request),
        },
      });

      this.logger.log(
        `Created login request ${loginRequest.id} for ${user.email} on a new device`,
      );

      await this.notificationsService.sendLoginRequestEmail({
        userName: user.name,
        userEmail: user.email,
        fingerprint: loginDto.fingerprint,
        deviceName: loginDto.deviceName,
        browser: loginDto.browser,
        operatingSystem: loginDto.operatingSystem,
        platform: loginDto.platform,
        ipAddress: this.resolveIpAddress(request),
      });

      return {
        requiresApproval: true,
        status: loginRequest.status,
        loginRequestId: loginRequest.id,
        message:
          'This device is new and must be approved by an admin before login.',
      };
    }

    await this.prisma.trustedDevice.update({
      where: { id: trustedDevice.id },
      data: {
        lastUsedAt: new Date(),
        deviceName: loginDto.deviceName ?? trustedDevice.deviceName,
        browser: loginDto.browser ?? trustedDevice.browser,
        operatingSystem:
          loginDto.operatingSystem ?? trustedDevice.operatingSystem,
        platform: loginDto.platform ?? trustedDevice.platform,
        userAgent: this.resolveUserAgent(request) ?? trustedDevice.userAgent,
        ipAddress: this.resolveIpAddress(request) ?? trustedDevice.ipAddress,
      },
    });

    this.logger.log(`Login successful for ${email} (${user.role})`);
    return this.buildLoginResponse(user);
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: Number(userId) },
      select: {
        id: true,
        name: true,
        agentCode: true,
        email: true,
        mobile: true,
        countryCode: true,
        designation: true,
        photo: true,
        bookmarkLimit: true,
        onlinePropertyLimit: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async logout(userId: number, userEmail: string) {
    this.logger.log(`User logged out: ${userEmail} (ID: ${userId})`);
    return {
      message: 'Logout successful',
      success: true,
    };
  }

  private resolveIpAddress(request: Request): string | null {
    const forwardedFor = request.headers['x-forwarded-for'];

    if (typeof forwardedFor === 'string') {
      return forwardedFor.split(',')[0]?.trim() ?? null;
    }

    if (Array.isArray(forwardedFor)) {
      return forwardedFor[0] ?? null;
    }

    return request.ip ?? null;
  }

  private resolveUserAgent(request: Request): string | null {
    const userAgent = request.headers['user-agent'];
    return typeof userAgent === 'string' ? userAgent : null;
  }

  private async buildLoginResponse(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const accessToken = await this.jwtService.signAsync(payload);
    const { password, ...userWithoutPassword } = user;

    return {
      access_token: accessToken,
      user: userWithoutPassword,
    };
  }
}

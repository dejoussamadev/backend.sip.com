import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { Request, Response } from 'express';
import type { StringValue } from 'ms';

const JWT_EXPIRATION = (process.env.JWT_EXPIRATION || '1d') as StringValue;

/** Converts a duration string like '7d', '1h', '30m' to milliseconds. */
function parseExpirationToMs(expiration: string): number {
  const match = expiration.match(/^(\d+)([smhd])$/);
  if (!match) return 24 * 60 * 60 * 1000; // default 1 day

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      return 24 * 60 * 60 * 1000;
  }
}

const COOKIE_MAX_AGE = parseExpirationToMs(JWT_EXPIRATION);

/**
 * Cookie attributes are env-driven so the same build runs against HTTP
 * (initial prod deploy, no TLS yet) and HTTPS (after TLS is wired up)
 * without code changes.
 *
 *   COOKIE_SECURE   = 'true' | 'false'  (default: false)
 *   COOKIE_SAMESITE = 'lax' | 'strict' | 'none' (default: 'lax')
 *
 * With the nginx reverse proxy in front, client and api share one origin,
 * so `lax` + `secure=false` is enough for HTTP. Flip to `secure=true` and
 * keep `lax` once TLS is in place. Use `none` only if you ever re-introduce
 * a cross-origin deployment (and then `secure=true` is mandatory).
 */
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true';
const COOKIE_SAMESITE = (process.env.COOKIE_SAMESITE ?? 'lax') as
  | 'lax'
  | 'strict'
  | 'none';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(loginDto, request);

    // If login requires approval, no token is generated — return as-is
    if ('requiresApproval' in result && result.requiresApproval) {
      return result;
    }

    // Set JWT as httpOnly cookie
    const { accessToken, ...body } = result as {
      accessToken: string;
      user: any;
    };
    response.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: COOKIE_SAMESITE,
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    });

    return body;
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: any) {
    return this.authService.getProfile(user.id);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: any,
    @Res({ passthrough: true }) response: Response,
  ) {
    response.clearCookie('access_token', {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: COOKIE_SAMESITE,
      path: '/',
    });

    return this.authService.logout(user.id, user.email);
  }
}

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
        case 's': return value * 1000;
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default:  return 24 * 60 * 60 * 1000;
    }
}

const COOKIE_MAX_AGE = parseExpirationToMs(JWT_EXPIRATION);

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('login')
    @Throttle({ default: { limit: 5, ttl: 60000 } })
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
        const { accessToken, ...body } = result as { accessToken: string; user: any };
        response.cookie('access_token', accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
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
            secure: true,
            sameSite: 'none',
            path: '/',
        });

        return this.authService.logout(user.id, user.email);
    }
}

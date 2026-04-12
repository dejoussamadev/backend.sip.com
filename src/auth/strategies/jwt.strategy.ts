import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { getJwtSecret } from '../jwt-secret';
import type { Request } from 'express';

/**
 * Extracts the JWT from the httpOnly 'access_token' cookie.
 */
function cookieExtractor(req: Request): string | null {
  return req?.cookies?.access_token ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: cookieExtractor,
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
    });
  }

  async validate(payload: any) {
    const agent = await this.prisma.user.findUnique({
      where: { id: Number(payload.sub) },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        agentCode: true,
        photo: true,
      },
    });

    if (!agent) {
      throw new UnauthorizedException('Agent non trouvé');
    }

    if (!agent.isActive) {
      throw new UnauthorizedException(
        "Votre compte est désactivé. Contactez l'administrateur.",
      );
    }

    return agent;
  }
}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'votre-secret-super-securise-ici',
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
          'Votre compte est désactivé. Contactez l\'administrateur.',
      );
    }

    return agent;
  }
}

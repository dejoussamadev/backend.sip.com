import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReservationLinkGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers['authorization'];
    const code = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!code) throw new UnauthorizedException('RESERVATION_LINK_INVALID');

    const link = await this.prisma.reservationLink.findUnique({
      where: { code },
      include: {
        property: {
          include: { user: true, type: true, furnishing: true },
        },
      },
    });

    if (!link) throw new UnauthorizedException('RESERVATION_LINK_INVALID');
    if (link.expiresAt < new Date())
      throw new UnauthorizedException('RESERVATION_LINK_EXPIRED');
    if (link.consumedAt)
      throw new UnauthorizedException('RESERVATION_LINK_USED');

    request.reservationLink = link;
    return true;
  }
}

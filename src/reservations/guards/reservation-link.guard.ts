import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorCatalogService } from '../../common/errors/error-catalog.service';
import { AppValidationException } from '../../common/errors/app-validation.exception';

@Injectable()
export class ReservationLinkGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: ErrorCatalogService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Reservation link codes travel in a dedicated header to avoid
    // ambiguity with JWT Bearer tokens processed by other middleware.
    const code: string | undefined = request.headers['x-reservation-code'];

    if (!code) {
      throw AppValidationException.from(this.catalog, [
        { code: 'RESERVATION_LINK_INVALID' },
      ]);
    }

    const link = await this.prisma.reservationLink.findUnique({
      where: { code },
      include: {
        property: {
          // Only select the fields downstream handlers actually need so that
          // sensitive agent columns (password hashes, tokens) are never fetched.
          select: {
            id: true,
            name: true,
            unitNumber: true,
            range: true,
            hasUtilities: true,
            type: { select: { id: true, name: true } },
            furnishing: { select: { id: true, name: true } },
            category: { select: { id: true, name: true, kind: true } },
          },
        },
        generatedBy: { select: { name: true, agentCode: true } },
      },
    });

    if (!link) {
      throw AppValidationException.from(this.catalog, [
        { code: 'RESERVATION_LINK_INVALID' },
      ]);
    }

    if (link.expiresAt < new Date()) {
      throw AppValidationException.from(this.catalog, [
        { code: 'RESERVATION_LINK_EXPIRED' },
      ]);
    }

    if (link.consumedAt) {
      throw AppValidationException.from(this.catalog, [
        { code: 'RESERVATION_LINK_USED' },
      ]);
    }

    request.reservationLink = link;
    return true;
  }
}

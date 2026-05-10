import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { BookingFeeModality, ReservationStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService, EmailContext } from '../notifications/email.service';
import { ErrorCatalogService } from '../common/errors/error-catalog.service';
import { AppValidationException } from '../common/errors/app-validation.exception';
import { normalizePagination } from '../common/utils/pagination.util';
import { generateReservationCode } from './utils/reservation-code.util';
import {
  RESERVATION_SUBMITTED,
  RESERVATION_APPROVED,
  RESERVATION_REJECTED,
} from '../notifications/notification-types';
import { validateIdNumber } from './validators/id-or-passport.validator';
import { SubmitReservationDto } from './dto/submit-reservation.dto';
import { SubmitPublicReservationDto } from './dto/submit-public-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ReservationQueryDto } from './dto/reservation-query.dto';

const DEFAULT_INCLUDE = {
  property: { include: { type: true, furnishing: true } },
  consultant: {
    select: { id: true, name: true, email: true, agentCode: true },
  },
  createdBy: { select: { id: true, name: true } },
  approvedBy: { select: { id: true, name: true } },
};

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
    private readonly catalog: ErrorCatalogService,
  ) {}

  // ────────────────────────────────────────────────────────────
  // Link generation
  // ────────────────────────────────────────────────────────────

  async generateLink(
    propertyId: number,
    generatedById: number,
    consultantSignatureUrl: string,
  ) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:4200';

    for (let attempt = 0; attempt < 3; attempt++) {
      const code = generateReservationCode();
      try {
        await this.prisma.reservationLink.create({
          data: {
            code,
            propertyId,
            generatedById,
            consultantSignatureUrl,
            expiresAt,
          },
        });
        return { url: `${baseUrl}/reservation/${code}`, expiresAt };
      } catch (err: any) {
        if (err?.code !== 'P2002') throw err;
        // Unique collision — retry with a new code
      }
    }

    throw new Error(
      'Failed to generate a unique reservation code after 3 attempts',
    );
  }

  // ────────────────────────────────────────────────────────────
  // Public context
  // ────────────────────────────────────────────────────────────

  getPublicContext(link: any) {
    const property = link.property;
    return {
      property: {
        name: property.name,
        unitNumber: property.unitNumber,
        type: { name: property.type?.name },
        furnishing: { name: property.furnishing?.name },
        hasUtilities: property.hasUtilities,
        range: property.range,
      },
      consultant: {
        name: property.user?.name,
        agentCode: property.user?.agentCode,
      },
      consultantSignatureUrl: link.consultantSignatureUrl,
    };
  }

  // ────────────────────────────────────────────────────────────
  // Shared validation helpers
  // ────────────────────────────────────────────────────────────

  private validateIdField(idType: string, idNumber: string) {
    if (!validateIdNumber(idType, idNumber)) {
      throw AppValidationException.from(this.catalog, [
        {
          field: 'idNumber',
          code:
            idType === 'ID'
              ? 'RESERVATION_ID_NUMBER_INVALID'
              : 'RESERVATION_PASSPORT_INVALID',
        },
      ]);
    }
  }

  private async resolvePropertyAndFee(
    propertyId: number,
    bookingFeeModality: BookingFeeModality,
    paidBookingFeeInput: number,
  ): Promise<{ property: any; paidBookingFee: number }> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });
    if (!property) {
      throw new NotFoundException(`Property ${propertyId} not found`);
    }

    let paidBookingFee: number;

    if (bookingFeeModality === BookingFeeModality.FULL) {
      paidBookingFee = Number(property.range);
    } else {
      // PARTIAL: 0 < paidBookingFee < property.range
      const rangeValue = Number(property.range);
      if (paidBookingFeeInput <= 0 || paidBookingFeeInput >= rangeValue) {
        throw AppValidationException.from(this.catalog, [
          {
            field: 'paidBookingFee',
            code: 'RESERVATION_PAID_BOOKING_FEE_OUT_OF_RANGE',
          },
        ]);
      }
      paidBookingFee = paidBookingFeeInput;
    }

    return { property, paidBookingFee };
  }

  private async dispatchSubmitNotifications(reservation: any, property: any) {
    const emailCtx: EmailContext = {
      reservationId: reservation.id,
      clientFirstName: reservation.firstName,
      clientLastName: reservation.lastName,
      clientEmail: reservation.email,
      propertyName: property.name,
      propertyRef: property.referenceNumber,
      reservationDate: new Date(reservation.reservationDate).toISOString(),
    };

    await Promise.allSettled([
      this.notificationsService.notify({
        type: RESERVATION_SUBMITTED,
        message: `New reservation #${reservation.id} submitted by ${reservation.firstName} ${reservation.lastName} for property "${property.name}".`,
        entityId: reservation.id,
        emailContext: emailCtx,
        recipients: {
          admins: true,
          userIds: [reservation.consultantId],
        },
      }),
      this.emailService.sendEmail(
        'RESERVATION_SUBMITTED_CLIENT',
        [reservation.email],
        {
          clientFirstName: reservation.firstName,
          clientLastName: reservation.lastName,
          propertyName: property.name,
          propertyRef: property.referenceNumber,
        },
      ),
    ]);
  }

  // ────────────────────────────────────────────────────────────
  // Submit (internal — authenticated agent/admin)
  // ────────────────────────────────────────────────────────────

  async submitInternal(
    dto: SubmitReservationDto,
    files: any,
    createdById: number,
  ) {
    this.validateIdField(dto.idType, dto.idNumber);

    const { property, paidBookingFee } = await this.resolvePropertyAndFee(
      dto.propertyId,
      dto.bookingFeeModality,
      dto.paidBookingFee,
    );

    const consultantId: number = property.userId;

    const clientSignatureUrl: string = files?.clientSignature?.[0]?.path ?? '';
    const consultantSignatureUrl: string =
      files?.consultantSignature?.[0]?.path ?? '';
    const paymentProofUrl: string | undefined =
      files?.paymentProof?.[0]?.path ?? undefined;

    const reservation = await this.prisma.reservation.create({
      data: {
        reservationDate: new Date(dto.reservationDate),
        firstName: dto.firstName,
        lastName: dto.lastName,
        nationality: dto.nationality,
        idType: dto.idType,
        idNumber: dto.idNumber,
        email: dto.email,
        phone: dto.phone,
        countryCode: dto.countryCode,
        propertyId: dto.propertyId,
        contractPeriod: dto.contractPeriod,
        paymentModality: dto.paymentModality,
        utilitiesIncluded: dto.utilitiesIncluded,
        moveInDate: new Date(dto.moveInDate),
        contractStartDate: new Date(dto.contractStartDate),
        bookingFeeModality: dto.bookingFeeModality,
        paidBookingFee,
        paymentMethod: dto.paymentMethod,
        securityDeposit: dto.securityDeposit,
        paymentProofUrl: paymentProofUrl ?? null,
        consultantId,
        clientSignatureUrl,
        consultantSignatureUrl,
        termsAcceptedAt: new Date(),
        status: ReservationStatus.PENDING_APPROVAL,
        createdById,
      },
      include: DEFAULT_INCLUDE,
    });

    await this.dispatchSubmitNotifications(reservation, property);

    return reservation;
  }

  // ────────────────────────────────────────────────────────────
  // Submit (public — via reservation link)
  // ────────────────────────────────────────────────────────────

  async submitPublic(dto: SubmitPublicReservationDto, files: any, link: any) {
    const propertyId: number = link.propertyId;
    const consultantId: number = link.property.userId;

    this.validateIdField(dto.idType, dto.idNumber);

    const { property, paidBookingFee } = await this.resolvePropertyAndFee(
      propertyId,
      dto.bookingFeeModality,
      dto.paidBookingFee,
    );

    const clientSignatureUrl: string = files?.clientSignature?.[0]?.path ?? '';
    const consultantSignatureUrl: string = link.consultantSignatureUrl ?? '';
    const paymentProofUrl: string | undefined =
      files?.paymentProof?.[0]?.path ?? undefined;

    const reservation = await this.prisma.$transaction(async (tx) => {
      // Mark the link as consumed atomically
      await tx.reservationLink.update({
        where: { id: link.id },
        data: { consumedAt: new Date() },
      });

      return tx.reservation.create({
        data: {
          reservationDate: new Date(dto.reservationDate),
          firstName: dto.firstName,
          lastName: dto.lastName,
          nationality: dto.nationality,
          idType: dto.idType,
          idNumber: dto.idNumber,
          email: dto.email,
          phone: dto.phone,
          countryCode: dto.countryCode,
          propertyId,
          contractPeriod: dto.contractPeriod,
          paymentModality: dto.paymentModality,
          utilitiesIncluded: dto.utilitiesIncluded,
          moveInDate: new Date(dto.moveInDate),
          contractStartDate: new Date(dto.contractStartDate),
          bookingFeeModality: dto.bookingFeeModality,
          paidBookingFee,
          paymentMethod: dto.paymentMethod,
          securityDeposit: dto.securityDeposit,
          paymentProofUrl: paymentProofUrl ?? null,
          consultantId,
          clientSignatureUrl,
          consultantSignatureUrl,
          termsAcceptedAt: new Date(),
          status: ReservationStatus.PENDING_APPROVAL,
          createdById: consultantId,
          linkId: link.id,
        },
        include: DEFAULT_INCLUDE,
      });
    });

    await this.dispatchSubmitNotifications(reservation, property);

    return reservation;
  }

  // ────────────────────────────────────────────────────────────
  // List
  // ────────────────────────────────────────────────────────────

  async findAll(query: ReservationQueryDto, currentUser: any) {
    const { page, limit, skip } = normalizePagination(
      query.page,
      query.limit,
      10,
    );

    const isAgent = currentUser.role === Role.AGENT;

    const where: any = {};

    if (query.propertyId) where.propertyId = query.propertyId;
    if (query.contractPeriod) where.contractPeriod = query.contractPeriod;
    if (query.status) where.status = query.status;

    if (isAgent) {
      // Agents can only see reservations they created or are consultant on
      where.OR = [
        { createdById: currentUser.id },
        { consultantId: currentUser.id },
      ];
    } else if (query.createdById) {
      // Admins can filter by createdById
      where.createdById = query.createdById;
    }

    const [data, total] = await Promise.all([
      this.prisma.reservation.findMany({
        where,
        include: DEFAULT_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.reservation.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ────────────────────────────────────────────────────────────
  // Find one
  // ────────────────────────────────────────────────────────────

  async findOne(id: number, currentUser: any) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: DEFAULT_INCLUDE,
    });

    if (!reservation)
      throw new NotFoundException(`Reservation ${id} not found`);

    const isAgent = currentUser.role === Role.AGENT;
    if (
      isAgent &&
      reservation.createdById !== currentUser.id &&
      reservation.consultantId !== currentUser.id
    ) {
      throw new ForbiddenException(
        'You do not have access to this reservation',
      );
    }

    return reservation;
  }

  // ────────────────────────────────────────────────────────────
  // Approve
  // ────────────────────────────────────────────────────────────

  async approve(id: number, approverId: number) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: { property: true },
    });

    if (!reservation)
      throw new NotFoundException(`Reservation ${id} not found`);

    if (reservation.status !== ReservationStatus.PENDING_APPROVAL) {
      throw AppValidationException.from(this.catalog, [
        { field: 'status', code: 'RESERVATION_NOT_PENDING' },
      ]);
    }

    const updated = await this.prisma.reservation.update({
      where: { id },
      data: {
        status: ReservationStatus.APPROVED,
        approvedById: approverId,
        approvedAt: new Date(),
      },
      include: DEFAULT_INCLUDE,
    });

    const emailCtx: EmailContext = {
      reservationId: id,
      clientFirstName: reservation.firstName,
      clientLastName: reservation.lastName,
      propertyName: reservation.property?.name,
    };

    await Promise.allSettled([
      this.notificationsService.notify({
        type: RESERVATION_APPROVED,
        message: `Reservation #${id} for ${reservation.firstName} ${reservation.lastName} has been approved.`,
        entityId: id,
        emailContext: emailCtx,
        recipients: {
          admins: false,
          userIds: [reservation.consultantId, reservation.createdById],
        },
      }),
      this.emailService.sendEmail(
        'RESERVATION_APPROVED_CLIENT',
        [reservation.email],
        emailCtx,
      ),
    ]);

    return updated;
  }

  // ────────────────────────────────────────────────────────────
  // Reject
  // ────────────────────────────────────────────────────────────

  async reject(id: number, approverId: number, reason: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: { property: true },
    });

    if (!reservation)
      throw new NotFoundException(`Reservation ${id} not found`);

    if (reservation.status !== ReservationStatus.PENDING_APPROVAL) {
      throw AppValidationException.from(this.catalog, [
        { field: 'status', code: 'RESERVATION_NOT_PENDING' },
      ]);
    }

    const updated = await this.prisma.reservation.update({
      where: { id },
      data: {
        status: ReservationStatus.REJECTED,
        rejectionReason: reason,
        approvedById: approverId,
        approvedAt: new Date(),
      },
      include: DEFAULT_INCLUDE,
    });

    const emailCtx: EmailContext = {
      reservationId: id,
      clientFirstName: reservation.firstName,
      clientLastName: reservation.lastName,
      propertyName: reservation.property?.name,
      rejectionReason: reason,
    };

    await Promise.allSettled([
      this.notificationsService.notify({
        type: RESERVATION_REJECTED,
        message: `Reservation #${id} for ${reservation.firstName} ${reservation.lastName} has been rejected.`,
        entityId: id,
        emailContext: emailCtx,
        recipients: {
          admins: false,
          userIds: [reservation.consultantId, reservation.createdById],
        },
      }),
      this.emailService.sendEmail(
        'RESERVATION_REJECTED_CLIENT',
        [reservation.email],
        emailCtx,
      ),
    ]);

    return updated;
  }

  // ────────────────────────────────────────────────────────────
  // Update (admin)
  // ────────────────────────────────────────────────────────────

  async update(id: number, dto: UpdateReservationDto, files?: any) {
    const existing = await this.prisma.reservation.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException(`Reservation ${id} not found`);

    const data: any = { ...dto };

    // Resolve dates if provided
    if (dto.reservationDate)
      data.reservationDate = new Date(dto.reservationDate);
    if (dto.moveInDate) data.moveInDate = new Date(dto.moveInDate);
    if (dto.contractStartDate)
      data.contractStartDate = new Date(dto.contractStartDate);

    // Validate idNumber if relevant fields are being updated
    const idType = dto.idType ?? existing.idType;
    const idNumber = dto.idNumber ?? existing.idNumber;
    if (dto.idType !== undefined || dto.idNumber !== undefined) {
      this.validateIdField(idType, idNumber);
    }

    // Replace file paths if new files are provided
    if (files?.clientSignature?.[0]?.path) {
      data.clientSignatureUrl = files.clientSignature[0].path;
    }
    if (files?.consultantSignature?.[0]?.path) {
      data.consultantSignatureUrl = files.consultantSignature[0].path;
    }
    if (files?.paymentProof?.[0]?.path) {
      data.paymentProofUrl = files.paymentProof[0].path;
    }

    return this.prisma.reservation.update({
      where: { id },
      data,
      include: DEFAULT_INCLUDE,
    });
  }
}

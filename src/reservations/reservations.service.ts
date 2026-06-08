import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CategoryKind,
  PaymentMode,
  PaymentModality,
  ReservationStatus,
  Role,
} from '@prisma/client';
import { isRentKind, isSaleKind } from './constants/reservation-fees.constants';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService, EmailContext } from '../notifications/email.service';
import { ErrorCatalogService } from '../common/errors/error-catalog.service';
import { AppValidationException } from '../common/errors/app-validation.exception';
import { normalizePagination } from '../common/utils/pagination.util';
import { generateReservationCode } from './utils/reservation-code.util';
import { buildReservationUpdateData } from './utils/reservation-update.utils';
import { mapReservationToResponse } from './utils/reservation-response.utils';
import { isMoveInDateValid } from './validators/move-in-date.validator';
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

/** How long (ms) a reservation link is valid after generation. */
const RESERVATION_LINK_TTL_MS = 24 * 60 * 60 * 1000;

/** Max retry attempts when a generated code collides on the unique constraint. */
const RESERVATION_CODE_MAX_RETRIES = 3;

const DEFAULT_INCLUDE = {
  property: {
    select: {
      name: true,
      unitNumber: true,
      range: true,
      downPaymentPct: true,
      commission: true,
      hasUtilities: true,
      type: { select: { name: true } },
      furnishing: { select: { name: true } },
      category: { select: { name: true, kind: true } },
    },
  },
  consultant: {
    select: { id: true, name: true, email: true, agentCode: true },
  },
  createdBy: { select: { id: true, name: true } },
  approvedBy: { select: { id: true, name: true } },
};

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
    private readonly catalog: ErrorCatalogService,
    private readonly config: ConfigService,
  ) {}

  // ────────────────────────────────────────────────────────────
  // Link generation
  // ────────────────────────────────────────────────────────────

  async generateLink(
    propertyId: number,
    currentUser: { id: number; role: Role },
    consultantSignatureUrl: string,
    unitNumber?: string,
    commissionPct?: number,
    downPaymentPct?: number,
  ) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        userId: true,
        multipleUnits: true,
        commission: true,
        downPaymentPct: true,
      },
    });

    if (!property) {
      throw AppValidationException.from(this.catalog, [
        { field: 'propertyId', code: 'RESERVATION_PROPERTY_NOT_FOUND' },
      ]);
    }

    if (property.multipleUnits) {
      if (!unitNumber?.trim()) {
        throw new BadRequestException(
          'unitNumber is required for multi-unit properties',
        );
      }
    }

    const baseUrl = this.config.get<string>('FRONTEND_URL');
    if (!baseUrl) {
      throw AppValidationException.from(this.catalog, [
        { code: 'RESERVATION_CODE_GENERATION_FAILED' },
      ]);
    }

    const resolvedCommissionPct =
      commissionPct ??
      (property.commission != null ? Number(property.commission) : null);
    const resolvedDownPaymentPct =
      downPaymentPct ??
      (property.downPaymentPct != null
        ? Number(property.downPaymentPct)
        : null);

    const expiresAt = new Date(Date.now() + RESERVATION_LINK_TTL_MS);

    for (let attempt = 0; attempt < RESERVATION_CODE_MAX_RETRIES; attempt++) {
      const code = generateReservationCode();
      try {
        await this.prisma.reservationLink.create({
          data: {
            code,
            propertyId,
            generatedById: currentUser.id,
            consultantSignatureUrl,
            expiresAt,
            unitNumber: property.multipleUnits ? (unitNumber ?? null) : null,
            commissionPct: resolvedCommissionPct,
            downPaymentPct: resolvedDownPaymentPct,
          },
        });
        return { url: `${baseUrl}/reservation/${code}`, expiresAt };
      } catch (err: any) {
        if (err?.code !== 'P2002') throw err;
        // Unique collision on `code` — retry with a new one
      }
    }

    throw AppValidationException.from(this.catalog, [
      { code: 'RESERVATION_CODE_GENERATION_FAILED' },
    ]);
  }

  // ────────────────────────────────────────────────────────────
  // Public context
  // ────────────────────────────────────────────────────────────

  getPublicContext(link: any) {
    const property = link.property;
    return {
      property: {
        name: property.name,
        unitNumber: link.unitNumber ?? property.unitNumber,
        type: { name: property.type?.name },
        furnishing: { name: property.furnishing?.name },
        category: property.category
          ? { name: property.category.name, kind: property.category.kind }
          : null,
        hasUtilities: property.hasUtilities,
        range: property.range,
        commissionPct:
          link.commissionPct != null ? Number(link.commissionPct) : null,
        downPaymentPct:
          link.downPaymentPct != null ? Number(link.downPaymentPct) : null,
      },
      consultant: {
        name: link.generatedBy?.name,
        agentCode: link.generatedBy?.agentCode,
      },
      consultantSignatureUrl: link.consultantSignatureUrl,
    };
  }

  // ────────────────────────────────────────────────────────────
  // Shared validation helpers
  // ────────────────────────────────────────────────────────────

  private validateIdField(idType: string, idNumber: string): void {
    if (!validateIdNumber(idType, idNumber)) {
      throw AppValidationException.from(this.catalog, [
        {
          field: 'idNumber',
          // 'ID' matches ReservationIdType.ID enum value
          code:
            idType === 'ID'
              ? 'RESERVATION_ID_NUMBER_INVALID'
              : 'RESERVATION_PASSPORT_INVALID',
        },
      ]);
    }
  }

  private validateMoveInDate(moveInDate: string): void {
    if (!isMoveInDateValid(moveInDate)) {
      throw AppValidationException.from(this.catalog, [
        { field: 'moveInDate', code: 'RESERVATION_MOVE_IN_DATE_PAST' },
      ]);
    }
  }

  private async resolveProperty(propertyId: number): Promise<any> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: { category: { select: { name: true, kind: true } } },
    });

    if (!property) {
      throw AppValidationException.from(this.catalog, [
        { field: 'propertyId', code: 'RESERVATION_PROPERTY_NOT_FOUND' },
      ]);
    }

    return property;
  }

  /**
   * Shared Full/Partial resolution for SALE and RENT. FULL locks amount to
   * sellingPrice; PARTIAL validates that amount is in (0, sellingPrice]. The
   * reservation fee is entered manually by the agent and submitted as a computed
   * amount, so it is trusted and stored as-is (rounded for consistency).
   */
  private resolveSaleOrRentFinancials(
    sellingPrice: number,
    dto: {
      paymentMode?: PaymentMode | null;
      paymentAmount?: number | null;
      reservationFeeAmount?: number;
    },
  ): {
    paymentMode: PaymentMode;
    paymentAmount: number;
    reservationFeeAmount: number;
  } {
    const roundMoney = (n: number) => Math.round(n * 100) / 100;
    const mode = dto.paymentMode ?? null;
    if (mode !== PaymentMode.FULL && mode !== PaymentMode.PARTIAL) {
      throw new BadRequestException('paymentMode is required');
    }

    let amount: number;
    if (mode === PaymentMode.FULL) {
      amount = sellingPrice;
    } else {
      const requested = Number(dto.paymentAmount);
      if (
        !Number.isFinite(requested) ||
        requested <= 0 ||
        requested > sellingPrice
      ) {
        throw AppValidationException.from(this.catalog, [
          {
            field: 'paymentAmount',
            code: 'RESERVATION_PAID_BOOKING_FEE_OUT_OF_RANGE',
          },
        ]);
      }
      amount = requested;
    }

    return {
      paymentMode: mode,
      paymentAmount: roundMoney(amount),
      reservationFeeAmount: roundMoney(Number(dto.reservationFeeAmount ?? 0)),
    };
  }

  /**
   * Server-side source of truth for reservation fee + payment-mode fields.
   *
   * Rent:  paymentMode required (FULL/PARTIAL); fee taken from the submitted amount.
   *        paymentModality and downPaymentPct are always null (rent-only).
   * Sale:  paymentMode required; paymentModality required; fee from submitted amount.
   * Unknown kind: trusts the client payload (legacy compatibility).
   */
  private resolveReservationFinancials(
    property: { category?: { kind?: CategoryKind } | null },
    dto: {
      sellingPrice: number;
      paymentMode?: PaymentMode | null;
      paymentAmount?: number | null;
      reservationFeeAmount?: number;
      reservationFeePct?: number | null;
      paymentModality?: PaymentModality | null;
      downPaymentPct?: number | null;
    },
  ): {
    paymentMode: PaymentMode | null;
    paymentAmount: number | null;
    reservationFeeAmount: number;
    paymentModality: PaymentModality | null;
    downPaymentPct: number | null;
  } {
    const categoryKind = property?.category?.kind ?? null;
    const sellingPrice = Number(dto.sellingPrice);

    if (isRentKind(categoryKind)) {
      const resolved = this.resolveSaleOrRentFinancials(sellingPrice, dto);
      return { ...resolved, paymentModality: null, downPaymentPct: null };
    }

    if (isSaleKind(categoryKind)) {
      if (!dto.paymentModality) {
        throw AppValidationException.from(this.catalog, [
          {
            field: 'paymentModality',
            code: 'RESERVATION_PAYMENT_MODALITY_REQUIRED_FOR_SALE',
          },
        ]);
      }
      const resolved = this.resolveSaleOrRentFinancials(sellingPrice, dto);
      return {
        ...resolved,
        paymentModality: dto.paymentModality,
        downPaymentPct: dto.downPaymentPct ?? null,
      };
    }

    // Category unknown — preserve previous behavior (trust the client) so we
    // don't break legacy data while category remains free-form.
    return {
      paymentMode: dto.paymentMode ?? null,
      paymentAmount:
        dto.paymentAmount != null ? Number(dto.paymentAmount) : null,
      reservationFeeAmount: Number(dto.reservationFeeAmount ?? 0),
      paymentModality: dto.paymentModality ?? null,
      downPaymentPct: dto.downPaymentPct ?? null,
    };
  }

  private async dispatchSubmitNotifications(
    reservation: any,
    property: any,
  ): Promise<void> {
    const emailCtx: EmailContext = {
      reservationId: reservation.id,
      clientFirstName: reservation.firstName,
      clientLastName: reservation.lastName,
      clientEmail: reservation.email,
      propertyName: property.name,
      propertyRef: property.referenceNumber,
      reservationDate: new Date(reservation.reservationDate).toISOString(),
    };

    const results = await Promise.allSettled([
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

    for (const result of results) {
      if (result.status === 'rejected') {
        this.logger.error(
          `Notification dispatch failed for reservation #${reservation.id}: ${result.reason}`,
        );
      }
    }
  }

  // ────────────────────────────────────────────────────────────
  // Submit (internal — authenticated agent/admin)
  // ────────────────────────────────────────────────────────────

  async submitInternal(
    dto: SubmitReservationDto,
    files: any,
    currentUser: { id: number; role: Role },
  ) {
    this.validateIdField(dto.idType, dto.idNumber);
    if (dto.moveInDate) this.validateMoveInDate(dto.moveInDate);

    const property = await this.resolveProperty(dto.propertyId);

    let reservationUnitNumber: string | null;
    if (property.multipleUnits) {
      if (!dto.unitNumber?.trim()) {
        throw new BadRequestException(
          'unitNumber is required for multi-unit properties',
        );
      }
      reservationUnitNumber = dto.unitNumber.trim();
    } else {
      reservationUnitNumber = property.unitNumber ?? null;
    }

    const consultantId: number = currentUser.id;

    const clientSignatureUrl: string = files?.clientSignature?.[0]?.path ?? '';
    const consultantSignatureUrl: string =
      files?.consultantSignature?.[0]?.path ?? '';
    const paymentProofUrl: string | null =
      files?.paymentProof?.[0]?.path ?? null;

    const financials = this.resolveReservationFinancials(property, dto);

    const reservation = await this.prisma.$transaction(async (tx) =>
      tx.reservation.create({
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
          unitNumber: reservationUnitNumber,
          contractPeriod: dto.contractPeriod,
          paymentModality: financials.paymentModality,
          moveInDate: dto.moveInDate ? new Date(dto.moveInDate) : null,
          contractStartDate: new Date(dto.contractStartDate),
          sellingPrice: dto.sellingPrice,
          downPaymentPct: financials.downPaymentPct,
          // Commission is the agent's earning — copied from the property
          // at submit time (form does not expose it to the agent/buyer).
          commissionPct:
            property.commission != null ? Number(property.commission) : null,
          reservationFeeAmount: financials.reservationFeeAmount,
          paymentMode: financials.paymentMode,
          paymentAmount: financials.paymentAmount,
          paymentMethod: dto.paymentMethod,
          paymentProofUrl,
          consultantId,
          clientSignatureUrl,
          consultantSignatureUrl,
          termsAcceptedAt: new Date(),
          status: ReservationStatus.PENDING_APPROVAL,
          createdById: currentUser.id,
        },
        include: DEFAULT_INCLUDE,
      }),
    );

    await this.dispatchSubmitNotifications(reservation, property);

    return mapReservationToResponse(reservation);
  }

  // ────────────────────────────────────────────────────────────
  // Submit (public — via reservation link)
  // ────────────────────────────────────────────────────────────

  async submitPublic(dto: SubmitPublicReservationDto, files: any, link: any) {
    const propertyId: number = link.propertyId;
    const consultantId: number = link.generatedById;

    this.validateIdField(dto.idType, dto.idNumber);
    if (dto.moveInDate) this.validateMoveInDate(dto.moveInDate);

    const property = await this.resolveProperty(propertyId);

    const clientSignatureUrl: string = files?.clientSignature?.[0]?.path ?? '';
    const consultantSignatureUrl: string = link.consultantSignatureUrl ?? '';
    const paymentProofUrl: string | null =
      files?.paymentProof?.[0]?.path ?? null;

    const financials = this.resolveReservationFinancials(property, {
      ...dto,
      downPaymentPct:
        link.downPaymentPct != null ? Number(link.downPaymentPct) : null,
    });

    const reservation = await this.prisma.$transaction(async (tx) => {
      // Re-check consumedAt inside the transaction to prevent a race condition
      // where two concurrent requests both pass the guard check but only one
      // should produce a reservation.
      const consumed = await tx.reservationLink.updateMany({
        where: { id: link.id, consumedAt: null },
        data: { consumedAt: new Date() },
      });

      if (consumed.count === 0) {
        throw AppValidationException.from(this.catalog, [
          { code: 'RESERVATION_LINK_ALREADY_CONSUMED' },
        ]);
      }

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
          unitNumber: link.unitNumber ?? property.unitNumber ?? null,
          contractPeriod: dto.contractPeriod,
          paymentModality: financials.paymentModality,
          moveInDate: dto.moveInDate ? new Date(dto.moveInDate) : null,
          contractStartDate: new Date(dto.contractStartDate),
          sellingPrice: dto.sellingPrice,
          downPaymentPct: financials.downPaymentPct,
          commissionPct:
            link.commissionPct != null ? Number(link.commissionPct) : null,
          reservationFeeAmount: financials.reservationFeeAmount,
          paymentMode: financials.paymentMode,
          paymentAmount: financials.paymentAmount,
          paymentMethod: dto.paymentMethod,
          paymentProofUrl,
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

    return mapReservationToResponse(reservation);
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
      data: data.map(mapReservationToResponse),
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

    if (!reservation) {
      throw AppValidationException.from(this.catalog, [
        { code: 'RESERVATION_NOT_FOUND' },
      ]);
    }

    const isAgent = currentUser.role === Role.AGENT;
    if (
      isAgent &&
      reservation.createdById !== currentUser.id &&
      reservation.consultantId !== currentUser.id
    ) {
      throw AppValidationException.from(this.catalog, [
        { code: 'RESERVATION_ACCESS_DENIED' },
      ]);
    }

    return mapReservationToResponse(reservation);
  }

  // ────────────────────────────────────────────────────────────
  // Approve
  // ────────────────────────────────────────────────────────────

  async approve(id: number, approverId: number) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: { property: true },
    });

    if (!reservation) {
      throw AppValidationException.from(this.catalog, [
        { code: 'RESERVATION_NOT_FOUND' },
      ]);
    }

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

    const results = await Promise.allSettled([
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

    for (const result of results) {
      if (result.status === 'rejected') {
        this.logger.error(
          `Approval notification failed for reservation #${id}: ${result.reason}`,
        );
      }
    }

    return mapReservationToResponse(updated);
  }

  // ────────────────────────────────────────────────────────────
  // Reject
  // ────────────────────────────────────────────────────────────

  async reject(id: number, approverId: number, reason: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: { property: true },
    });

    if (!reservation) {
      throw AppValidationException.from(this.catalog, [
        { code: 'RESERVATION_NOT_FOUND' },
      ]);
    }

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

    const results = await Promise.allSettled([
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

    for (const result of results) {
      if (result.status === 'rejected') {
        this.logger.error(
          `Rejection notification failed for reservation #${id}: ${result.reason}`,
        );
      }
    }

    return mapReservationToResponse(updated);
  }

  // ────────────────────────────────────────────────────────────
  // Update (admin)
  // ────────────────────────────────────────────────────────────

  async update(id: number, dto: UpdateReservationDto, files?: any) {
    const existing = await this.prisma.reservation.findUnique({
      where: { id },
    });

    if (!existing) {
      throw AppValidationException.from(this.catalog, [
        { code: 'RESERVATION_NOT_FOUND' },
      ]);
    }

    if (existing.status !== ReservationStatus.PENDING_APPROVAL) {
      throw AppValidationException.from(this.catalog, [
        { field: 'status', code: 'RESERVATION_NOT_EDITABLE' },
      ]);
    }

    // PartialType/OmitType produces an opaque mapped type; cast to access fields.
    const patch = dto as Record<string, unknown>;

    // Build safe update payload from explicit allowlist
    const data = buildReservationUpdateData(patch);

    // If id fields are being updated, re-validate them
    if (patch['idType'] !== undefined || patch['idNumber'] !== undefined) {
      const idType = (patch['idType'] ?? existing.idType) as string;
      const idNumber = (patch['idNumber'] ?? existing.idNumber) as string;
      this.validateIdField(idType, idNumber);
    }

    // If move-in date is being updated, validate it
    if (patch['moveInDate'] !== undefined && patch['moveInDate']) {
      this.validateMoveInDate(patch['moveInDate'] as string);
    }

    // Replace file paths if new files are provided
    if (files?.clientSignature?.[0]?.path) {
      data['clientSignatureUrl'] = files.clientSignature[0].path;
    }
    if (files?.consultantSignature?.[0]?.path) {
      data['consultantSignatureUrl'] = files.consultantSignature[0].path;
    }
    if (files?.paymentProof?.[0]?.path) {
      data['paymentProofUrl'] = files.paymentProof[0].path;
    }

    const updated = await this.prisma.reservation.update({
      where: { id },
      data,
      include: DEFAULT_INCLUDE,
    });

    return mapReservationToResponse(updated);
  }
}

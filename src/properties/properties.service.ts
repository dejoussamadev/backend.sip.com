import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import {
  CATEGORY_TO_TYPES,
  TYPE_TO_LAYOUTS,
} from './constants/property.options';
import { generateRef } from './utils/ref.generator';
import {
  PropertyCategory,
  PropertyType,
  StatusOption,
} from './constants/property.enums';
import { Prisma, NotificationType, PropertyStatus, Role } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { normalizePagination } from '../common/utils/pagination.util';
import { parseBool } from '../common/utils/parse-bool.util';

@Injectable()
export class PropertiesService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async getNextReferenceNumber(
    categoryId: number,
    typeId: number,
  ): Promise<{ referenceNumber: string }> {
    const referenceNumber = await generateRef(this.prisma, categoryId, typeId);
    return { referenceNumber };
  }

  private validateDependencies(
    category: PropertyCategory,
    type: PropertyType,
    layout?: string,
  ) {
    const allowedTypes = CATEGORY_TO_TYPES[category];
    if (allowedTypes && !allowedTypes.includes(type)) {
      throw new BadRequestException(
        `Type ${type} not allowed for category ${category}`,
      );
    }
    if (layout) {
      const allowedLayouts = TYPE_TO_LAYOUTS[type];
      if (allowedLayouts && !allowedLayouts.includes(layout as any)) {
        throw new BadRequestException(
          `Layout ${layout} not allowed for type ${type}`,
        );
      }
    }
  }

  private normalizeRules(dto: CreatePropertyDto | UpdatePropertyDto) {
    // Land : neutralise les champs non pertinents
    if (dto.type === PropertyType.LAND) {
      dto.bathrooms = undefined;
      dto.maidRoom = undefined;
      dto.layout = 'sqm_space' as any;
      dto.balcony = undefined;
      dto.view = undefined;
      dto.furnishing = undefined;
    }

    if (dto.utilitiesIncluded === false) {
      dto.utilityIds = [];
    }
    if (dto.facilitiesEnabled === false) {
      dto.facilityIds = [];
    }
  }

  private dedupeIds(ids?: number[]): number[] {
    if (!ids?.length) return [];
    return Array.from(new Set(ids.filter((n) => Number.isFinite(n))));
  }

  private toPropertyStatus(
    status?:
      | StatusOption
      | PropertyStatus
      | keyof typeof PropertyStatus
      | string,
  ): PropertyStatus | undefined {
    if (status === undefined || status === null) return undefined;
    if (typeof status === 'string') {
      return PropertyStatus[status as keyof typeof PropertyStatus];
    }
    if (typeof status === 'number') {
      const statusKey = StatusOption[status] as keyof typeof PropertyStatus;
      return statusKey ? PropertyStatus[statusKey] : undefined;
    }
    return status as PropertyStatus;
  }

  private ensureValidStatus(
    status:
      | StatusOption
      | PropertyStatus
      | keyof typeof PropertyStatus
      | string,
  ): PropertyStatus {
    const mapped = this.toPropertyStatus(status);
    if (!mapped) {
      throw new BadRequestException('Invalid status');
    }
    return mapped;
  }

  async create(
    dto: CreatePropertyDto,
    agentName: string = 'Unknown',
    userRole?: Role,
  ) {
    if (dto.category && dto.type) {
      this.validateDependencies(dto.category, dto.type, dto.layout);
    }
    this.normalizeRules(dto);

    const isAdmin = userRole === Role.ADMIN;
    const resolvedStatus =
      isAdmin && dto.status !== undefined
        ? this.ensureValidStatus(dto.status)
        : PropertyStatus.PENDING;

    const referenceNumber =
      dto.refNo && dto.refNo.trim()
        ? dto.refNo.trim()
        : await generateRef(
            this.prisma,
            dto.categoryId ? Number(dto.categoryId) : 0,
            dto.typeId ? Number(dto.typeId) : 0,
          );

    const userId = dto.agentId ? Number(dto.agentId) : undefined;
    const landlordId = dto.landlordId ? Number(dto.landlordId) : undefined;
    const categoryId = dto.categoryId ? Number(dto.categoryId) : undefined;
    const typeId = dto.typeId ? Number(dto.typeId) : undefined;
    const layoutId = dto.layoutId ? Number(dto.layoutId) : undefined;
    const locationId = dto.locationId ? Number(dto.locationId) : undefined;
    const furnishingId = dto.furnishingId
      ? Number(dto.furnishingId)
      : undefined;

    const createData: any = {
      referenceNumber,
      name: dto.name,
      shortTerm: dto.shortTerm ?? false,
      unitNumber: dto.unitNo ?? null,
      bathrooms: dto.bathrooms ?? 0,
      size: dto.sizeSqm ?? 0,
      maidRoom: dto.maidRoom ?? false,
      balcony: dto.balcony ?? '',
      view: dto.view ?? null,
      range: dto.price ?? 0,
      commission: dto.commissionPct ?? 0,
      status: resolvedStatus,
      expirationDate: dto.expiryDate
        ? typeof dto.expiryDate === 'string'
          ? new Date(dto.expiryDate)
          : dto.expiryDate instanceof Date
            ? dto.expiryDate
            : new Date(String(dto.expiryDate))
        : null,
      access: dto.access ?? null,
      hasUtilities: dto.utilitiesIncluded ?? false,
      hasFacilities: dto.facilitiesEnabled ?? false,
      details: dto.propertyDetails ?? '',
      directions: dto.propertyNotes ?? '',
      images: dto.imageUrls ?? [],
      document: dto.documents?.[0] ?? null,
    };

    if (categoryId !== undefined) createData.categoryId = categoryId;
    if (typeId !== undefined) createData.typeId = typeId;
    if (layoutId !== undefined) createData.layoutId = layoutId;
    if (locationId !== undefined) createData.locationId = locationId;
    if (furnishingId !== undefined) createData.furnishingId = furnishingId;
    if (userId !== undefined) createData.userId = userId;
    if (landlordId !== undefined) createData.landlordId = landlordId;

    const facilityIds = this.dedupeIds(dto.facilityIds);
    const utilityIds = this.dedupeIds(dto.utilityIds);

    const property = await this.prisma.$transaction(async (tx) => {
      const created = await tx.property.create({ data: createData });

      if (dto.facilitiesEnabled && facilityIds.length) {
        await tx.propertyFacility.createMany({
          data: facilityIds.map((facilityId) => ({
            propertyId: created.id,
            facilityId,
          })),
          skipDuplicates: true,
        });
      }

      if (dto.utilitiesIncluded && utilityIds.length) {
        await tx.propertyUtility.createMany({
          data: utilityIds.map((utilityId) => ({
            propertyId: created.id,
            utilityId,
          })),
          skipDuplicates: true,
        });
      }

      return created;
    });

    const now = new Date().toLocaleString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    await this.notificationsService.notify({
      type: NotificationType.PROPERTY_CREATED,
      message: `A new property with reference id ${property.referenceNumber} has been added by ${agentName} on ${now}.`,
      emailContext: {
        referenceNumber: property.referenceNumber,
        propertyName: property.name,
        agentName,
        price: Number(property.range),
        status: property.status,
      },
      recipients: {
        admins: true,
        userIds: userId ? [userId] : [],
      },
    });

    return property;
  }

  async findAll(
    filters: any = {},
    currentUser?: { id: number; role: Role },
  ) {
    const {
      keyword,
      status,
      type,
      typeId,
      category,
      categoryId,
      layoutId,
      locationCode,
      locationId,
      furnishingId,
      agentId,
      landlordId,
      minPrice,
      maxPrice,
      minAmount,
      maxAmount,
      minSize,
      maxSize,
      bathrooms,
      maidRoom,
      shortTerm,
      utilitiesIncluded,
      balcony,
      view,
      facilityId,
      expiringSoon,
      mine,
      page = '1',
      limit = '10',
      skip,
      take,
    } = filters;

    const resolvedLimit = take ?? limit;
    const pagination = normalizePagination(page, resolvedLimit);
    const requestedSkip = skip !== undefined ? Number(skip) : undefined;
    const resolvedSkip =
      requestedSkip !== undefined &&
      Number.isFinite(requestedSkip) &&
      requestedSkip >= 0
        ? Math.floor(requestedSkip)
        : pagination.skip;
    const resolvedTake = pagination.limit;

    const isExpiringSoon = parseBool(expiringSoon) === true;
    const isMine = parseBool(mine) === true;
    const fourteenDaysFromNow = isExpiringSoon
      ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      : null;
    const enforcedAgentId =
      isMine && currentUser?.role === Role.AGENT ? currentUser.id : undefined;

    const where: Prisma.PropertyWhereInput = {
      OR: keyword
        ? [
            { name: { contains: keyword, mode: 'insensitive' } },
            { referenceNumber: { contains: keyword, mode: 'insensitive' } },
            { details: { contains: keyword, mode: 'insensitive' } },
            { directions: { contains: keyword, mode: 'insensitive' } },
          ]
        : undefined,
      status: status
        ? status
        : isExpiringSoon
          ? ({ not: PropertyStatus.ARCHIVED } as any)
          : undefined,
      categoryId: categoryId ? Number(categoryId) : undefined,
      typeId: typeId ? Number(typeId) : undefined,
      layoutId: layoutId ? Number(layoutId) : undefined,
      locationId: locationId ? Number(locationId) : undefined,
      furnishingId: furnishingId ? Number(furnishingId) : undefined,
      type: type
        ? {
            is: {
              name: {
                equals: type,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          }
        : undefined,
      category: category
        ? {
            is: {
              name: {
                equals: category,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          }
        : undefined,
      location: locationCode
        ? {
            is: {
              name: {
                contains: locationCode,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          }
        : undefined,
      userId:
        enforcedAgentId !== undefined
          ? enforcedAgentId
          : agentId
            ? Number(agentId)
            : undefined,
      landlordId: landlordId ? Number(landlordId) : undefined,
      expirationDate: isExpiringSoon
        ? { gte: new Date(), lte: fourteenDaysFromNow! }
        : undefined,
      range: {
        gte: minPrice
          ? Number(minPrice)
          : minAmount
            ? Number(minAmount)
            : undefined,
        lte: maxPrice
          ? Number(maxPrice)
          : maxAmount
            ? Number(maxAmount)
            : undefined,
      },
      size:
        minSize || maxSize
          ? {
              gte: minSize ? Number(minSize) : undefined,
              lte: maxSize ? Number(maxSize) : undefined,
            }
          : undefined,
      bathrooms: bathrooms ? Number(bathrooms) : undefined,
      maidRoom: parseBool(maidRoom),
      shortTerm: parseBool(shortTerm),
      hasUtilities: parseBool(utilitiesIncluded),
      balcony: balcony || undefined,
      view: view || undefined,
      facilities: facilityId
        ? {
            some: {
              facilityId: Number(facilityId),
            },
          }
        : undefined,
    };

    const include = {
      category: true,
      type: true,
      layout: true,
      location: true,
      user: true,
      landlord: true,
    };

    const [data, total] = await Promise.all([
      this.prisma.property.findMany({
        where,
        include,
        orderBy: { updatedAt: 'desc' },
        skip: resolvedSkip,
        take: resolvedTake,
      }),
      this.prisma.property.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: Math.floor(resolvedSkip / resolvedTake) + 1,
        limit: resolvedTake,
        totalPages: Math.ceil(total / resolvedTake),
      },
    };
  }

  async findOne(id: number) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: {
        category: true,
        type: true,
        layout: true,
        location: true,
        furnishing: true,
        user: true,
        landlord: true,
        facilities: {
          include: {
            facility: true,
          },
        },
        utilities: {
          include: {
            utility: true,
          },
        },
      },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    return {
      ...property,
      utilities: property.utilities.map((u) => ({
        id: u.utility.id,
        name: u.utility.name,
      })),
      facilities: property.facilities.map((f) => ({
        id: f.facility.id,
        name: f.facility.name,
      })),
    };
  }

  async update(
    id: number,
    dto: UpdatePropertyDto,
    agentName: string = 'Unknown',
  ) {
    const current = await this.findOne(id);
    const category = dto.category ?? (current as any).category?.name;
    const type = dto.type ?? (current as any).type?.name;

    if (category && type) {
      this.validateDependencies(
        category as PropertyCategory,
        type as PropertyType,
        dto.layout ?? (current as any).layout?.name,
      );
    }
    this.normalizeRules(dto);

    const updateData: any = {};

    if (dto.name) updateData.name = dto.name;
    if (dto.bathrooms !== undefined) updateData.bathrooms = dto.bathrooms;
    if (dto.sizeSqm !== undefined) updateData.size = dto.sizeSqm;
    if (dto.maidRoom !== undefined) updateData.maidRoom = dto.maidRoom;
    if (dto.balcony !== undefined) updateData.balcony = dto.balcony;
    if (dto.view !== undefined) updateData.view = dto.view;
    if (dto.price !== undefined) updateData.range = dto.price;
    if (dto.commissionPct !== undefined)
      updateData.commission = dto.commissionPct;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.access !== undefined) updateData.access = dto.access;
    if (dto.utilitiesIncluded !== undefined)
      updateData.hasUtilities = dto.utilitiesIncluded;
    if (dto.facilitiesEnabled !== undefined)
      updateData.hasFacilities = dto.facilitiesEnabled;
    if (dto.propertyDetails !== undefined)
      updateData.details = dto.propertyDetails;
    if (dto.propertyNotes !== undefined)
      updateData.directions = dto.propertyNotes;
    if (dto.imageUrls !== undefined) updateData.images = dto.imageUrls;
    if (dto.expiryDate !== undefined)
      updateData.expirationDate =
        typeof dto.expiryDate === 'string'
          ? new Date(dto.expiryDate)
          : dto.expiryDate instanceof Date
            ? dto.expiryDate
            : new Date(String(dto.expiryDate));
    if (dto.agentId) updateData.userId = Number(dto.agentId);
    if (dto.landlordId) updateData.landlordId = Number(dto.landlordId);
    if (dto.categoryId) updateData.categoryId = Number(dto.categoryId);
    if (dto.typeId) updateData.typeId = Number(dto.typeId);
    if (dto.layoutId) updateData.layoutId = Number(dto.layoutId);
    if (dto.locationId) updateData.locationId = Number(dto.locationId);
    if (dto.furnishingId) updateData.furnishingId = Number(dto.furnishingId);
    if (dto.status !== undefined)
      updateData.status = this.ensureValidStatus(dto.status);

    const facilityIds =
      dto.facilityIds !== undefined ? this.dedupeIds(dto.facilityIds) : undefined;
    const utilityIds =
      dto.utilityIds !== undefined ? this.dedupeIds(dto.utilityIds) : undefined;

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.property.update({
        where: { id },
        data: updateData,
      });

      if (facilityIds !== undefined) {
        await tx.propertyFacility.deleteMany({ where: { propertyId: id } });
        if (facilityIds.length) {
          await tx.propertyFacility.createMany({
            data: facilityIds.map((facilityId) => ({
              propertyId: id,
              facilityId,
            })),
            skipDuplicates: true,
          });
        }
      }

      if (utilityIds !== undefined) {
        await tx.propertyUtility.deleteMany({ where: { propertyId: id } });
        if (utilityIds.length) {
          await tx.propertyUtility.createMany({
            data: utilityIds.map((utilityId) => ({
              propertyId: id,
              utilityId,
            })),
            skipDuplicates: true,
          });
        }
      }

      return result;
    });

    const now = new Date().toLocaleString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    await this.notificationsService.notify({
      type: NotificationType.PROPERTY_UPDATED,
      message: `Property with reference id ${updated.referenceNumber} has been updated by ${agentName} on ${now}.`,
      emailContext: {
        referenceNumber: updated.referenceNumber,
        propertyName: (updated as any).name,
        agentName,
      },
      recipients: {
        admins: true,
        userIds: (current as any).userId ? [(current as any).userId] : [],
      },
    });

    return updated;
  }

  async replace(
    id: number,
    dto: CreatePropertyDto,
    agentName: string = 'Unknown',
  ) {
    const current = await this.findOne(id);

    if (dto.category && dto.type) {
      this.validateDependencies(dto.category, dto.type, dto.layout);
    }
    this.normalizeRules(dto);

    const referenceNumber = dto.refNo?.trim()
      ? dto.refNo.trim()
      : (current as any).referenceNumber;

    const userId = dto.agentId ? Number(dto.agentId) : undefined;
    const landlordId = dto.landlordId ? Number(dto.landlordId) : undefined;
    const categoryId = dto.categoryId ? Number(dto.categoryId) : undefined;
    const typeId = dto.typeId ? Number(dto.typeId) : undefined;
    const layoutId = dto.layoutId ? Number(dto.layoutId) : undefined;
    const locationId = dto.locationId ? Number(dto.locationId) : undefined;
    const furnishingId = dto.furnishingId
      ? Number(dto.furnishingId)
      : undefined;

    const updateData: any = {
      referenceNumber,
      name: dto.name,
      shortTerm: dto.shortTerm ?? false,
      unitNumber: dto.unitNo ?? null,
      bathrooms: dto.bathrooms ?? 0,
      size: dto.sizeSqm ?? 0,
      maidRoom: dto.maidRoom ?? false,
      balcony: dto.balcony ?? '',
      view: dto.view ?? null,
      range: dto.price ?? 0,
      commission: dto.commissionPct ?? 0,
      status:
        dto.status !== undefined
          ? this.ensureValidStatus(dto.status)
          : (current as any).status,
      expirationDate: dto.expiryDate
        ? typeof dto.expiryDate === 'string'
          ? new Date(dto.expiryDate)
          : dto.expiryDate instanceof Date
            ? dto.expiryDate
            : new Date(String(dto.expiryDate))
        : (current as any).expirationDate,
      access: dto.access ?? null,
      hasUtilities: dto.utilitiesIncluded ?? false,
      hasFacilities: dto.facilitiesEnabled ?? false,
      details: dto.propertyDetails ?? '',
      directions: dto.propertyNotes ?? '',
      images: dto.imageUrls ?? [],
      document: dto.documents?.[0] ?? null,
      categoryId,
      typeId,
      layoutId,
      locationId,
      furnishingId,
      userId,
      landlordId,
    };

    const facilityIds = this.dedupeIds(dto.facilityIds);
    const utilityIds = this.dedupeIds(dto.utilityIds);

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.property.update({
        where: { id },
        data: updateData,
      });

      await tx.propertyFacility.deleteMany({ where: { propertyId: id } });
      if (dto.facilitiesEnabled && facilityIds.length) {
        await tx.propertyFacility.createMany({
          data: facilityIds.map((facilityId) => ({
            propertyId: id,
            facilityId,
          })),
          skipDuplicates: true,
        });
      }

      await tx.propertyUtility.deleteMany({ where: { propertyId: id } });
      if (dto.utilitiesIncluded && utilityIds.length) {
        await tx.propertyUtility.createMany({
          data: utilityIds.map((utilityId) => ({
            propertyId: id,
            utilityId,
          })),
          skipDuplicates: true,
        });
      }

      return result;
    });

    const now = new Date().toLocaleString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    await this.notificationsService.notify({
      type: NotificationType.PROPERTY_UPDATED,
      message: `Property with reference id ${updated.referenceNumber} has been updated by ${agentName} on ${now}.`,
      emailContext: {
        referenceNumber: updated.referenceNumber,
        propertyName: (updated as any).name,
        agentName,
      },
      recipients: {
        admins: true,
        userIds: (current as any).userId ? [(current as any).userId] : [],
      },
    });

    return updated;
  }

  async remove(id: number, agentName: string = 'Unknown') {
    const property = await this.findOne(id);
    await this.prisma.property.delete({ where: { id } });

    const now = new Date().toLocaleString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    await this.notificationsService.notify({
      type: NotificationType.PROPERTY_DELETED,
      message: `Property with reference id ${(property as any).referenceNumber} has been deleted by ${agentName} on ${now}.`,
      emailContext: {
        referenceNumber: (property as any).referenceNumber,
        propertyName: (property as any).name,
        agentName,
      },
      recipients: {
        admins: true,
        userIds: (property as any).userId ? [(property as any).userId] : [],
      },
    });

    return property;
  }

  // Landlords pour le dropdown
  async getLandlords() {
    return this.prisma.landlord.findMany({
      select: {
        id: true,
        name: true,
        mobile: true,
        countryCode: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  // Agents pour le dropdown
  async getAgents() {
    return this.prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        agentCode: true,
        mobile: true,
      },
      orderBy: { name: 'asc' },
    });
  }
}

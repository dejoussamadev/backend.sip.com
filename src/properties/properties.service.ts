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
import { PropertyCategory, PropertyType } from './constants/property.enums';
import { PropertyStatus } from '@prisma/client';

@Injectable()
export class PropertiesService {
  constructor(private prisma: PrismaService) {}

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
      dto.bedrooms = undefined;
      dto.maidRoom = undefined;
      dto.layout = 'sqm_space' as any;
      dto.balcony = undefined;
      dto.view = undefined;
      dto.furnishing = undefined;
    }

    // Utilities : si non inclus, tout à false
    if (!dto.utilitiesIncluded) {
      dto.utilitiesWaterElec = false;
      dto.utilitiesInternet = false;
      dto.utilitiesServiceCharge = false;
      dto.utilitiesSewage = false;
      dto.utilitiesDistrictCooling = false;
    }

    // Facilities : si désactivées, tout à false
    if (!dto.facilitiesEnabled) {
      dto.facSharedPool = false;
      dto.facClubHouse = false;
      dto.facSauna = false;
      dto.facCinema = false;
      dto.facSquash = false;
      dto.facMultiPurposeHall = false;
      dto.facCateringService = false;
      dto.facPrivatePool = false;
      dto.facKidsPlay = false;
      dto.facSteamRoom = false;
      dto.facPadelCourt = false;
      dto.facBasketBall = false;
      dto.facTennis = false;
      dto.facMosque = false;
      dto.facLaundryService = false;
      dto.facGym = false;
      dto.facJacuzzi = false;
      dto.facBBQ = false;
      dto.facFootball = false;
      dto.facCoWorking = false;
      dto.facCleaningService = false;
    }
  }

  async create(dto: CreatePropertyDto) {
    if (dto.category && dto.type) {
      this.validateDependencies(dto.category, dto.type, dto.layout);
    }
    this.normalizeRules(dto);

    const referenceNumber =
      dto.refNo && dto.refNo.trim()
        ? dto.refNo.trim()
        : await generateRef(
            this.prisma,
            dto.categoryId ? Number(dto.categoryId) : 0,
            dto.typeId ? Number(dto.typeId) : 0,
          );

    const agentId = dto.agentId ? Number(dto.agentId) : undefined;
    const landlordId = dto.landlordId ? Number(dto.landlordId) : undefined;
    const categoryId = dto.categoryId ? Number(dto.categoryId) : undefined;
    const typeId = dto.typeId ? Number(dto.typeId) : undefined;
    const layoutId = dto.layoutId ? Number(dto.layoutId) : undefined;
    const locationId = dto.locationId ? Number(dto.locationId) : undefined;
    const furnishingId = dto.furnishingId ? Number(dto.furnishingId) : undefined;

    return this.prisma.property.create({
      data: {
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
        status: PropertyStatus.PENDING,
        expirationDate: dto.expiryDate
          ? new Date(dto.expiryDate as string)
          : new Date(),
        access: dto.access ?? null,
        hasUtilities: dto.utilitiesIncluded ?? false,
        hasFacilities: dto.facilitiesEnabled ?? false,
        details: dto.propertyDetails ?? '',
        directions: dto.propertyNotes ?? '',
        images: dto.imageUrls ?? [],
        document: dto.documents?.[0] ?? null,
        categoryId: categoryId,
        typeId: typeId,
        layoutId: layoutId,
        locationId: locationId,
        furnishingId: furnishingId,
        agentId: agentId,
        landlordId: landlordId,
      } as any,
    });
  }

  async findAll(filters: any = {}) {
    const {
      status,
      agentId,
      landlordId,
      minPrice,
      maxPrice,
      bathrooms,
      page = '1',
      limit = '10',
    } = filters;

    const take = Number(limit);
    const skip = (Number(page) - 1) * take;

    const where = {
      status: status || undefined,
      agentId: agentId ? Number(agentId) : undefined,
      landlordId: landlordId ? Number(landlordId) : undefined,
      range: {
        gte: minPrice ? Number(minPrice) : undefined,
        lte: maxPrice ? Number(maxPrice) : undefined,
      },
      bathrooms: bathrooms ? Number(bathrooms) : undefined,
    };

    const include = {
      category: true,
      type: true,
      layout: true,
      location: true,
      agent: true,
      landlord: true,
    };

    const [data, total] = await Promise.all([
      this.prisma.property.findMany({
        where,
        include,
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.property.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: Number(page),
        limit: take,
        totalPages: Math.ceil(total / take),
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
        agent: true,
        landlord: true,
      },
    });
    if (!property) throw new NotFoundException('Property not found');
    return property;
  }

  async update(id: number, dto: UpdatePropertyDto) {
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
      updateData.expirationDate = new Date(dto.expiryDate as string);
    if (dto.agentId) updateData.agentId = Number(dto.agentId);
    if (dto.landlordId) updateData.landlordId = Number(dto.landlordId);
    if (dto.categoryId) updateData.categoryId = Number(dto.categoryId);
    if (dto.typeId) updateData.typeId = Number(dto.typeId);
    if (dto.layoutId) updateData.layoutId = Number(dto.layoutId);
    if (dto.locationId) updateData.locationId = Number(dto.locationId);
    if (dto.furnishingId) updateData.furnishingId = Number(dto.furnishingId);

    return this.prisma.property.update({
      where: { id },
      data: updateData,
    });
  }

  async advancedSearch(filters: Record<string, string>) {
    const where: any = {};

    if (filters.maidRoom)
      where.maidRoom = filters.maidRoom === 'true' || filters.maidRoom === '1';
    if (filters.status) where.status = filters.status;
    if (filters.bathroom) where.bathrooms = Number(filters.bathroom);
    if (filters.balcony) where.balcony = filters.balcony;
    if (filters.view) where.view = filters.view;
    if (filters.agent) where.agentId = Number(filters.agent);
    if (filters.landlord) where.landlordId = Number(filters.landlord);

    // Recherche sur les montants (range)
    if (filters.minAmount || filters.maxAmount) {
      where.range = {};
      if (filters.minAmount) where.range.gte = Number(filters.minAmount);
      if (filters.maxAmount) where.range.lte = Number(filters.maxAmount);
    }

    // Recherche sur la taille des biens
    if (filters.minSize || filters.maxSize) {
      where.size = {};
      if (filters.minSize) where.size.gte = Number(filters.minSize);
      if (filters.maxSize) where.size.lte = Number(filters.maxSize);
    }

    return this.prisma.property.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: filters.take ? Number(filters.take) : 100,
      skip: filters.skip ? Number(filters.skip) : 0,
      include: {
        category: true,
        type: true,
        layout: true,
        location: true,
        agent: true,
        landlord: true,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.property.delete({ where: { id } });
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
    return this.prisma.agent.findMany({
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

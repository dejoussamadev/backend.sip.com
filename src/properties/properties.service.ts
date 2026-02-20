import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { CATEGORY_TO_TYPES, TYPE_TO_LAYOUTS } from './constants/property.options';
import { generateRef } from './utils/ref.generator';
import { PropertyCategory, PropertyType } from './constants/property.enums';

@Injectable()
export class PropertiesService {
  constructor(private prisma: PrismaService) {}

  private validateDependencies(category: PropertyCategory, type: PropertyType, layout?: string) {
    const allowedTypes = CATEGORY_TO_TYPES[category];
    if (allowedTypes && !allowedTypes.includes(type)) {
      throw new BadRequestException(`Type ${type} not allowed for category ${category}`);
    }
    if (layout) {
      const allowedLayouts = TYPE_TO_LAYOUTS[type];
      if (allowedLayouts && !allowedLayouts.includes(layout as any)) {
        throw new BadRequestException(`Layout ${layout} not allowed for type ${type}`);
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
    this.validateDependencies(dto.category, dto.type, dto.layout);
    this.normalizeRules(dto);

    const refNo = dto.refNo?.trim()
      ? dto.refNo.trim()
      : await generateRef(this.prisma, dto.category, dto.type);

    return this.prisma.property.create({
      data: { ...dto, refNo },
    });
  }

  async findAll(filters: any = {}) {
    const {
      status, type, category, locationCode, minPrice, maxPrice,
      bedrooms, bathrooms, agentId, landlordId,
    } = filters;
    return this.prisma.property.findMany({
      where: {
        status,
        type,
        category,
        locationCode,
        agentId,
        landlordId,
        price: {
          gte: minPrice ? Number(minPrice) : undefined,
          lte: maxPrice ? Number(maxPrice) : undefined,
        },
        bedrooms: bedrooms ? Number(bedrooms) : undefined,
        bathrooms: bathrooms ? Number(bathrooms) : undefined,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property) throw new NotFoundException('Property not found');
    return property;
  }

  async update(id: string, dto: UpdatePropertyDto) {
    const current = await this.findOne(id);
    const category = dto.category ?? (current as any).category;
    const type = dto.type ?? (current as any).type;

    this.validateDependencies(category as PropertyCategory, type as PropertyType, dto.layout ?? (current as any).layout);
    this.normalizeRules(dto);

    return this.prisma.property.update({
      where: { id },
      data: dto,
    });
  }

  async advancedSearch(filters: Record<string, string>) {
    const where: any = {};

    if (filters.category)    where.category    = filters.category;
    if (filters.type)        where.type        = filters.type;
    if (filters.layout)      where.layout      = filters.layout;
    if (filters.location)    where.location    = filters.location;
    if (filters.maidRoom)    where.maidRoom    = filters.maidRoom === 'true' || filters.maidRoom === '1';
    if (filters.furnishing)  where.furnishing  = filters.furnishing;
    if (filters.landlord)    where.landlordId  = filters.landlord;
    if (filters.status)      where.status      = filters.status;
    if (filters.term)        where.term        = filters.term;
    if (filters.bathroom)    where.bathrooms   = Number(filters.bathroom);
    if (filters.balcony)     where.balcony     = filters.balcony;
    if (filters.facility)    where.facility    = filters.facility;
    if (filters.utility)     where.utility     = filters.utility;
    if (filters.view)        where.view        = filters.view;
    if (filters.agent)       where.agentId     = filters.agent;

    // Recherche sur les montants
    if (filters.minAmount || filters.maxAmount) {
      where.price = {};
      if (filters.minAmount) where.price.gte = Number(filters.minAmount);
      if (filters.maxAmount) where.price.lte = Number(filters.maxAmount);
    }

    // Recherche sur la taille des biens
    if (filters.minSize || filters.maxSize) {
      where.size = {};
      if (filters.minSize) where.size.gte = Number(filters.minSize);
      if (filters.maxSize) where.size.lte = Number(filters.maxSize);
    }

    return this.prisma.property.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters.take ? Number(filters.take) : 100,
      skip: filters.skip ? Number(filters.skip) : 0,
    });
  }



  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.property.delete({ where: { id } });
  }
}

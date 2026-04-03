import {
    Injectable,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import {PrismaService} from '../prisma/prisma.service';
import {CreatePropertyDto} from './dto/create-property.dto';
import {UpdatePropertyDto} from './dto/update-property.dto';
import {
    CATEGORY_TO_TYPES,
    TYPE_TO_LAYOUTS,
} from './constants/property.options';
import {generateRef} from './utils/ref.generator';
import {PropertyCategory, PropertyType, StatusOption} from './constants/property.enums';
import {Prisma, PropertyStatus, Role} from '@prisma/client';
import {NotificationsService} from '../notifications/notifications.service';
import { normalizePagination } from '../common/utils/pagination.util';

@Injectable()
export class PropertiesService {
    constructor(
        private prisma: PrismaService,
        private notificationsService: NotificationsService,
    ) {
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

    private toPropertyStatus(
        status?: StatusOption | PropertyStatus | keyof typeof PropertyStatus | string,
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
        status: StatusOption | PropertyStatus | keyof typeof PropertyStatus | string,
    ): PropertyStatus {
        const mapped = this.toPropertyStatus(status);
        if (!mapped) {
            throw new BadRequestException('Invalid status');
        }
        return mapped;
    }

    async create(dto: CreatePropertyDto, agentName: string = 'Unknown', userRole?: Role) {
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

        const property = await this.prisma.property.create({
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
                status: resolvedStatus,
                expirationDate: dto.expiryDate
                    ? (typeof dto.expiryDate === 'string'
                        ? new Date(dto.expiryDate)
                        : dto.expiryDate instanceof Date
                            ? dto.expiryDate
                            : new Date(String(dto.expiryDate)))
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
                userId: userId,
                landlordId: landlordId,
            } as any,
        });

        // Déclencher la notification
        await this.notificationsService.notifyPropertyCreated(property.referenceNumber, agentName);
        if (!isAdmin) {
            await this.notificationsService.sendPropertyCreatedEmail({
                referenceNumber: property.referenceNumber,
                name: property.name,
                agentName,
                price: property.range,
                status: property.status,
            });
        }

        return property;
    }

    async findAll(filters: any = {}) {
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
            bedrooms,
            bathrooms,
            maidRoom,
            shortTerm,
            utilitiesIncluded,
            balcony,
            view,
            facilityId,
            page = '1',
            limit = '10',
            skip,
            take,
        } = filters;

        const resolvedLimit = take ?? limit;
        const pagination = normalizePagination(page, resolvedLimit);
        const requestedSkip = skip !== undefined ? Number(skip) : undefined;
        const resolvedSkip =
            requestedSkip !== undefined && Number.isFinite(requestedSkip) && requestedSkip >= 0
                ? Math.floor(requestedSkip)
                : pagination.skip;
        const resolvedTake = pagination.limit;

        const where: Prisma.PropertyWhereInput = {
            OR: keyword
                ? [
                    {name: {contains: keyword, mode: 'insensitive'}},
                    {referenceNumber: {contains: keyword, mode: 'insensitive'}},
                    {details: {contains: keyword, mode: 'insensitive'}},
                    {directions: {contains: keyword, mode: 'insensitive'}},
                ]
                : undefined,
            status: status || undefined,
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
            userId: agentId ? Number(agentId) : undefined,
            landlordId: landlordId ? Number(landlordId) : undefined,
            range: {
                gte: minPrice ? Number(minPrice) : minAmount ? Number(minAmount) : undefined,
                lte: maxPrice ? Number(maxPrice) : maxAmount ? Number(maxAmount) : undefined,
            },
            size: minSize || maxSize
                ? {
                    gte: minSize ? Number(minSize) : undefined,
                    lte: maxSize ? Number(maxSize) : undefined,
                }
                : undefined,
            // The current Property model has no bedrooms column yet, so this filter cannot be applied here.
            bathrooms: bathrooms ? Number(bathrooms) : undefined,
            maidRoom: maidRoom !== undefined ? maidRoom === 'true' || maidRoom === '1' : undefined,
            shortTerm: shortTerm !== undefined ? shortTerm === 'true' || shortTerm === '1' : undefined,
            hasUtilities: utilitiesIncluded !== undefined
                ? utilitiesIncluded === 'true' || utilitiesIncluded === '1'
                : undefined,
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
                orderBy: {updatedAt: 'desc'},
                skip: resolvedSkip,
                take: resolvedTake,
            }),
            this.prisma.property.count({where}),
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

            utilities: property.utilities.map(u => ({
                id: u.utility.id,
                name: u.utility.name,
            })),

            facilities: property.facilities.map(f => ({
                id: f.facility.id,
                name: f.facility.name,
            })),
        };
    }

    async update(id: number, dto: UpdatePropertyDto, agentName: string = 'Unknown') {
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
        if (dto.status !== undefined) updateData.status = this.ensureValidStatus(dto.status);

        const updated = await this.prisma.property.update({
            where: {id},
            data: updateData,
        });

        // Déclencher la notification
        await this.notificationsService.notifyPropertyUpdated(updated.referenceNumber, agentName);

        return updated;
    }

    async replace(id: number, dto: CreatePropertyDto, agentName: string = 'Unknown') {
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
        const furnishingId = dto.furnishingId ? Number(dto.furnishingId) : undefined;

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
            status: dto.status !== undefined
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

        const updated = await this.prisma.property.update({
            where: {id},
            data: updateData,
        });

        await this.notificationsService.notifyPropertyUpdated(
            updated.referenceNumber,
            agentName,
        );

        return updated;
    }

    async remove(id: number) {
        await this.findOne(id);
        return this.prisma.property.delete({where: {id}});
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
            orderBy: {name: 'asc'},
        });
    }

    // Agents pour le dropdown
    async getAgents() {
        return this.prisma.user.findMany({
            where: {isActive: true},
            select: {
                id: true,
                name: true,
                agentCode: true,
                mobile: true,
            },
            orderBy: {name: 'asc'},
        });
    }
}

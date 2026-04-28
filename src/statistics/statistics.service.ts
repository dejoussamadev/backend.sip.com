import { Injectable } from '@nestjs/common';
import { PropertyStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { normalizePagination } from '../common/utils/pagination.util';
import { OverviewStatisticsDto } from './dto/overview-statistics.dto';
import { AdminStatisticsDto } from './dto/admin-statistics.dto';

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(user: {
    id: number;
    role: Role;
  }): Promise<OverviewStatisticsDto> {
    const isAgent = user.role === Role.AGENT;

    const [totalProperties, agentPropertyCount, latestProperties] =
      await Promise.all([
        this.prisma.property.count(),

        isAgent
          ? this.prisma.property.count({ where: { userId: user.id } })
          : Promise.resolve(undefined),

        this.prisma.property.findMany({
          select: {
            id: true,
            name: true,
            referenceNumber: true,
            status: true,
            createdAt: true,
            images: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
      ]);

    return {
      totalProperties,
      ...(isAgent ? { myProperties: agentPropertyCount } : {}),
      latestProperties: latestProperties.map(({ images, ...rest }) => ({
        ...rest,
        image: images?.[0] ?? null,
      })),
    };
  }

  async getMyProperties(userId: number, page = '1', limit = '10') {
    const pagination = normalizePagination(page, limit);

    const where = { userId };
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
        skip: pagination.skip,
        take: pagination.limit,
      }),
      this.prisma.property.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: Math.floor(pagination.skip / pagination.limit) + 1,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  async getAdminStatistics(): Promise<AdminStatisticsDto> {
    const now = new Date();
    const fourteenDaysFromNow = new Date();
    fourteenDaysFromNow.setDate(now.getDate() + 14);

    const [
      statusBreakdown,
      topLandlords,
      topAgents,
      topTypes,
      topLocations,
      pendingCount,
      expiringCount,
      categoryBreakdown,
    ] = await Promise.all([
      this.prisma.property.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),

      this.prisma.landlord.findMany({
        select: {
          id: true,
          name: true,
          _count: { select: { properties: true } },
        },
        orderBy: { properties: { _count: 'desc' } },
        take: 5,
      }),

      this.prisma.user.findMany({
        where: { role: Role.AGENT },
        select: {
          id: true,
          name: true,
          agentCode: true,
          _count: { select: { properties: true } },
        },
        orderBy: { properties: { _count: 'desc' } },
        take: 5,
      }),

      this.prisma.type.findMany({
        select: {
          id: true,
          name: true,
          _count: { select: { properties: true } },
        },
        orderBy: { properties: { _count: 'desc' } },
        take: 5,
      }),

      this.prisma.location.findMany({
        select: {
          id: true,
          name: true,
          _count: { select: { properties: true } },
        },
        orderBy: { properties: { _count: 'desc' } },
        take: 5,
      }),

      this.prisma.property.count({
        where: { status: PropertyStatus.PENDING },
      }),

      this.prisma.property.count({
        where: {
          status: { not: PropertyStatus.ARCHIVED },
          expirationDate: {
            gte: now,
            lte: fourteenDaysFromNow,
          },
        },
      }),

      this.prisma.property.groupBy({
        by: ['categoryId'],
        _count: { _all: true },
      }),
    ]);

    // Compute status percentages
    const totalProperties = statusBreakdown.reduce(
      (sum, s) => sum + s._count._all,
      0,
    );
    const statusPercentages = statusBreakdown.map((s) => ({
      status: s.status,
      count: s._count._all,
      percentage:
        totalProperties > 0
          ? Math.round((s._count._all / totalProperties) * 10000) / 100
          : 0,
    }));

    // Resolve category names
    const categoryIds = categoryBreakdown.map((c) => c.categoryId);
    const categories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });
    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

    const propertiesByCategory = categoryBreakdown.map((c) => ({
      categoryId: c.categoryId,
      categoryName: categoryMap.get(c.categoryId) ?? 'Unknown',
      count: c._count._all,
    }));

    return {
      statusPercentages,
      topLandlords: topLandlords.map(({ _count, ...rest }) => ({
        ...rest,
        propertiesCount: _count.properties,
      })),
      topAgents: topAgents.map(({ _count, ...rest }) => ({
        ...rest,
        propertiesCount: _count.properties,
      })),
      topTypes: topTypes.map(({ _count, ...rest }) => ({
        ...rest,
        propertiesCount: _count.properties,
      })),
      topLocations: topLocations.map(({ _count, ...rest }) => ({
        ...rest,
        propertiesCount: _count.properties,
      })),
      pendingCount,
      expiringCount,
      propertiesByCategory,
    };
  }
}

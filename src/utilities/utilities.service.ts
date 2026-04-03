import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUtilityDto } from './dto/create-utility.dto';
import { UpdateUtilityDto } from './dto/update-utility.dto';
import { normalizePagination } from '../common/utils/pagination.util';

@Injectable()
export class UtilitiesService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateUtilityDto) {
    return this.prisma.utility.create({ data: dto });
  }

  async findAll(options: {
    paginate: boolean;
    page: unknown;
    limit: unknown;
    search?: string;
  }) {
    const { paginate, page, limit, search } = options;

    const where = search
      ? { OR: [{ name: { contains: search, mode: 'insensitive' as const } }] }
      : {};
    const include = {
      _count: { select: { properties: true } },
    };
    const mapUtility = ({ _count, ...utility }: any) => ({
      ...utility,
      propertiesCount: _count.properties,
    });

    if (!paginate) {
      const data = await this.prisma.utility.findMany({
        where,
        orderBy: { name: 'asc' },
        include,
      });
      return data.map(mapUtility);
    }

    const pagination = normalizePagination(page, limit);
    const skip = pagination.skip;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.utility.findMany({
        where,
        orderBy: { id: 'desc' },
        include,
        skip,
        take: pagination.limit,
      }),
      this.prisma.utility.count({ where }),
    ]);

    return {
      data: data.map(mapUtility),
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  async findOne(id: number) {
    const utility = await this.prisma.utility.findUnique({ where: { id } });
    if (!utility) throw new NotFoundException('Utility not found');
    return utility;
  }

  async update(id: number, dto: UpdateUtilityDto) {
    await this.findOne(id);
    return this.prisma.utility.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.utility.delete({ where: { id } });
  }

  // Récupérer les properties qui ont cette utility
  async findPropertiesByUtility(id: number) {
    await this.findOne(id);
    const propertyUtilities = await this.prisma.propertyUtility.findMany({
      where: { utilityId: id },
      include: {
        property: {
          include: {
            category: true,
            type: true,
            layout: true,
            location: true,
            user: true,
            landlord: true,
          },
        },
      },
    });
    return propertyUtilities.map((pu) => pu.property);
  }

  async countUtilities() {
    return {
      total: await this.prisma.utility.count(),
    };
  }
}

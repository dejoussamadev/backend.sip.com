import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTypeDto } from './dto/create-type.dto';
import { UpdateTypeDto } from './dto/update-type.dto';
import { normalizePagination } from '../common/utils/pagination.util';

@Injectable()
export class TypesService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateTypeDto) {
    return this.prisma.type.create({ data: dto });
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
      categories: { include: { category: true } },
      layouts: { include: { layout: true } },
      _count: { select: { properties: true } },
    };
    const mapType = ({ _count, ...type }: any) => ({
      ...type,
      propertiesCount: _count.properties,
    });

    if (!paginate) {
      const data = await this.prisma.type.findMany({
        where,
        include,
        orderBy: { name: 'asc' },
      });
      return data.map(mapType);
    }

    const pagination = normalizePagination(page, limit);
    const skip = pagination.skip;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.type.findMany({
        where,
        include,
        orderBy: { id: 'desc' },
        skip,
        take: pagination.limit,
      }),
      this.prisma.type.count({ where }),
    ]);

    return {
      data: data.map(mapType),
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  async findOne(id: number) {
    const type = await this.prisma.type.findUnique({
      where: { id },
      include: {
        categories: { include: { category: true } },
        layouts: { include: { layout: true } },
      },
    });
    if (!type) throw new NotFoundException('Type not found');
    return type;
  }

  async update(id: number, dto: UpdateTypeDto) {
    await this.findOne(id);
    return this.prisma.type.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.type.delete({ where: { id } });
  }

  // Récupérer les properties d'un type
  async findPropertiesByType(id: number) {
    await this.findOne(id);
    return this.prisma.property.findMany({
      where: { typeId: id },
      include: {
        category: true,
        layout: true,
        location: true,
        user: true,
        landlord: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // Récupérer les layouts d'un type
  async findLayoutsByType(id: number) {
    await this.findOne(id);
    const typeLayouts = await this.prisma.typeLayout.findMany({
      where: { typeId: id },
      include: { layout: true },
    });
    return typeLayouts.map((tl) => tl.layout);
  }

  // Récupérer les categories d'un type
  async findTypesByCategory(id: number) {
    const categoryTypes = await this.prisma.categoryType.findMany({
      where: { categoryId: id },
      include: { type: true },
    });
    return categoryTypes.map((ct) => ct.type);
  }

  async countTypes() {
    return {
      total: await this.prisma.type.count(),
    };
  }
}

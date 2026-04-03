import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFurnishingDto } from './dto/create-furnishing.dto';
import { UpdateFurnishingDto } from './dto/update-furnishing.dto';

@Injectable()
export class FurnishingsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateFurnishingDto) {
    return this.prisma.furnishing.create({ data: dto });
  }

  async findAll(options: {
    paginate: boolean;
    page: number;
    limit: number;
    search?: string;
  }) {
    const { paginate, page, limit, search } = options;

    const where = search
      ? { OR: [{ name: { contains: search, mode: 'insensitive' as const } }] }
      : {};
    const include = {
      categories: { include: { category: true } },
      _count: { select: { properties: true } },
    };
    const mapFurnishing = ({ _count, ...furnishing }: any) => ({
      ...furnishing,
      propertiesCount: _count.properties,
    });

    if (!paginate) {
      const data = await this.prisma.furnishing.findMany({
        where,
        include,
        orderBy: { name: 'asc' },
      });
      return data.map(mapFurnishing);
    }

    const skip = (page - 1) * limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.furnishing.findMany({
        where,
        include,
        orderBy: { id: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.furnishing.count({ where }),
    ]);

    return {
      data: data.map(mapFurnishing),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const furnishing = await this.prisma.furnishing.findUnique({
      where: { id },
      include: { categories: { include: { category: true } } },
    });
    if (!furnishing) throw new NotFoundException('Furnishing not found');
    return furnishing;
  }

  async update(id: number, dto: UpdateFurnishingDto) {
    await this.findOne(id);
    return this.prisma.furnishing.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.furnishing.delete({ where: { id } });
  }

  // Récupérer les properties d'un furnishing
  async findPropertiesByFurnishing(id: number) {
    await this.findOne(id);
    return this.prisma.property.findMany({
      where: { furnishingId: id },
      include: {
        category: true,
        type: true,
        layout: true,
        location: true,
        user: true,
        landlord: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // Récupérer les categories d'un furnishing
  async findFurnishingByCategories(id: number) {
    const catFurnishings = await this.prisma.categoryFurnishing.findMany({
      where: { categoryId: id },
      include: { furnishing: true },
    });
    return catFurnishings.map((cf) => cf.furnishing);
  }

  async countFurnishings() {
    return {
      total: await this.prisma.furnishing.count(),
    };
  }
}

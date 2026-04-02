import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateCategoryDto) {
    return this.prisma.category.create({ data: dto });
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
      types: { include: { type: true } },
      furnishings: { include: { furnishing: true } },
      _count: { select: { properties: true } },
    };
    const mapCategory = ({ _count, ...category }: any) => ({
      ...category,
      propertiesCount: _count.properties,
    });

    if (!paginate) {
      const data = await this.prisma.category.findMany({
        where,
        include,
        orderBy: { name: 'asc' },
      });
      return data.map(mapCategory);
    }

    const skip = (page - 1) * limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        where,
        include,
        orderBy: { id: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.category.count({ where }),
    ]);

    return {
      data: data.map(mapCategory),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        types: { include: { type: true } },
        furnishings: { include: { furnishing: true } },
      },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async update(id: number, dto: UpdateCategoryDto) {
    await this.findOne(id);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.category.delete({ where: { id } });
  }

  // Récupérer les properties d'une catégorie
  async findPropertiesByCategory(id: number) {
    await this.findOne(id);
    return this.prisma.property.findMany({
      where: { categoryId: id },
      include: {
        type: true,
        layout: true,
        location: true,
        user: true,
        landlord: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // Récupérer les types d'une catégorie
  async findTypesByCategory(id: number) {
    await this.findOne(id);
    const categoryTypes = await this.prisma.categoryType.findMany({
      where: { categoryId: id },
      include: { type: true },
    });
    return categoryTypes.map((ct) => ct.type);
  }

  // Récupérer les furnishings d'une catégorie
  async findFurnishingsByCategory(id: number) {
    await this.findOne(id);
    const categoryFurnishings = await this.prisma.categoryFurnishing.findMany({
      where: { categoryId: id },
      include: { furnishing: true },
    });
    return categoryFurnishings.map((cf) => cf.furnishing);
  }

  async countCategories() {
    return {
      total: await this.prisma.category.count(),
    };
  }
}

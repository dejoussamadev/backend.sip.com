import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLayoutDto } from './dto/create-layout.dto';
import { UpdateLayoutDto } from './dto/update-layout.dto';
import { normalizePagination } from '../common/utils/pagination.util';

@Injectable()
export class LayoutsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateLayoutDto) {
    return this.prisma.layout.create({ data: dto });
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
      _count: { select: { properties: true, types: true } },
    };

    const mapLayout = ({ _count, ...landlord }: any) => ({
      ...landlord,
      propertiesCount: _count.properties,
      typesCount: _count.types,
    });

    if (!paginate) {
      const data = await this.prisma.layout.findMany({
        where,
        orderBy: { id: 'asc' },
        include,
      });
      return data.map(mapLayout);
    }

    const pagination = normalizePagination(page, limit);
    const skip = pagination.skip;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.layout.findMany({
        where,
        orderBy: { id: 'desc' },
        include,
        skip,
        take: pagination.limit,
      }),
      this.prisma.layout.count({ where }),
    ]);

    return {
      data: data.map(mapLayout),
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  async findOne(id: number) {
    const layout = await this.prisma.layout.findUnique({
      where: { id },
      include: { types: { include: { type: true } } },
    });
    if (!layout) throw new NotFoundException('Layout not found');
    return layout;
  }

  async update(id: number, dto: UpdateLayoutDto) {
    await this.findOne(id);
    return this.prisma.layout.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    const count = await this.prisma.property.count({ where: { layoutId: id } });
    if (count > 0) {
      throw new ConflictException(
        `Cannot delete layout: ${count} properties are still linked to it`,
      );
    }
    return this.prisma.layout.delete({ where: { id } });
  }

  // Récupérer les properties d'un layout
  async findPropertiesByLayout(id: number) {
    await this.findOne(id);
    return this.prisma.property.findMany({
      where: { layoutId: id },
      include: {
        category: true,
        type: true,
        location: true,
        user: true,
        landlord: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // Récupérer les types d'un layout
  async findLayoutsByType(id: number) {
    const typeLayouts = await this.prisma.typeLayout.findMany({
      where: { typeId: id },
      include: { layout: true },
    });
    return typeLayouts.map((tl) => tl.layout);
  }

  async countLayouts() {
    return {
      total: await this.prisma.layout.count(),
    };
  }
}

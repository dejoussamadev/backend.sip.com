import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { normalizePagination } from '../common/utils/pagination.util';

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateLocationDto) {
    return this.prisma.location.create({ data: dto });
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
    const mapLocation = ({ _count, ...location }: any) => ({
      ...location,
      propertiesCount: _count.properties,
    });

    if (!paginate) {
      const data = await this.prisma.location.findMany({
        where,
        orderBy: { name: 'asc' },
        include,
      });
      return data.map(mapLocation);
    }

    const pagination = normalizePagination(page, limit);
    const skip = pagination.skip;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.location.findMany({
        where,
        orderBy: { id: 'desc' },
        include,
        skip,
        take: pagination.limit,
      }),
      this.prisma.location.count({ where }),
    ]);

    return {
      data: data.map(mapLocation),
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  async findOne(id: number) {
    const location = await this.prisma.location.findUnique({ where: { id } });
    if (!location) throw new NotFoundException('Location not found');
    return location;
  }

  async update(id: number, dto: UpdateLocationDto) {
    await this.findOne(id);
    return this.prisma.location.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    const count = await this.prisma.property.count({ where: { locationId: id } });
    if (count > 0) {
      throw new ConflictException(
        `Cannot delete location: ${count} properties are still linked to it`,
      );
    }
    return this.prisma.location.delete({ where: { id } });
  }

  // Récupérer les properties d'une location
  async findPropertiesByLocation(id: number) {
    await this.findOne(id);
    return this.prisma.property.findMany({
      where: { locationId: id },
      include: { category: true, type: true, layout: true, user: true, landlord: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async countLocations() {
    return {
      total: await this.prisma.location.count(),
    };
  }
}

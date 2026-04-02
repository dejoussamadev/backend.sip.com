import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateLocationDto) {
    return this.prisma.location.create({ data: dto });
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

    const skip = (page - 1) * limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.location.findMany({
        where,
        orderBy: { id: 'desc' },
        include,
        skip,
        take: limit,
      }),
      this.prisma.location.count({ where }),
    ]);

    return {
      data: data.map(mapLocation),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
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

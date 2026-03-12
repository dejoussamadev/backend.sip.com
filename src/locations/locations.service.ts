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

  findAll() {
    return this.prisma.location.findMany({ orderBy: { name: 'asc' } });
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
      include: { category: true, type: true, layout: true, agent: true, landlord: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async countLocations() {
    return {
      total: await this.prisma.location.count(),
    };
  }
}

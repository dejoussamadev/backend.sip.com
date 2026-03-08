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

  findAll() {
    return this.prisma.furnishing.findMany({
      include: { categories: { include: { category: true } } },
      orderBy: { name: 'asc' },
    });
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
      include: { category: true, type: true, layout: true, location: true, agent: true, landlord: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // Récupérer les categories d'un furnishing
  async findCategoriesByFurnishing(id: number) {
    await this.findOne(id);
    const catFurnishings = await this.prisma.categoryFurnishing.findMany({
      where: { furnishingId: id },
      include: { category: true },
    });
    return catFurnishings.map((cf) => cf.category);
  }
}

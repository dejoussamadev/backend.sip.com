import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTypeDto } from './dto/create-type.dto';
import { UpdateTypeDto } from './dto/update-type.dto';

@Injectable()
export class TypesService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateTypeDto) {
    return this.prisma.type.create({ data: dto });
  }

  findAll() {
    return this.prisma.type.findMany({
      include: {
        categories: { include: { category: true } },
        layouts: { include: { layout: true } },
      },
      orderBy: { name: 'asc' },
    });
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
        agent: true,
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
    console.log('hello');
    const categoryTypes = await this.prisma.categoryType.findMany({
      where: { categoryId: id },
      include: { type: true },
    });
    console.log(categoryTypes);
    return categoryTypes.map((ct) => ct.type);
  }

  async countTypes() {
    return {
      total: await this.prisma.type.count(),
    };
  }
}

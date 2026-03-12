import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLayoutDto } from './dto/create-layout.dto';
import { UpdateLayoutDto } from './dto/update-layout.dto';

@Injectable()
export class LayoutsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateLayoutDto) {
    return this.prisma.layout.create({ data: dto });
  }

  findAll() {
    return this.prisma.layout.findMany({
      include: { types: { include: { type: true } } },
      orderBy: { name: 'asc' },
    });
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
    return this.prisma.layout.delete({ where: { id } });
  }

  // Récupérer les properties d'un layout
  async findPropertiesByLayout(id: number) {
    await this.findOne(id);
    return this.prisma.property.findMany({
      where: { layoutId: id },
      include: { category: true, type: true, location: true, agent: true, landlord: true },
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

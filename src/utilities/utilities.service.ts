import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUtilityDto } from './dto/create-utility.dto';
import { UpdateUtilityDto } from './dto/update-utility.dto';

@Injectable()
export class UtilitiesService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateUtilityDto) {
    return this.prisma.utility.create({ data: dto });
  }

  findAll() {
    return this.prisma.utility.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: number) {
    const utility = await this.prisma.utility.findUnique({ where: { id } });
    if (!utility) throw new NotFoundException('Utility not found');
    return utility;
  }

  async update(id: number, dto: UpdateUtilityDto) {
    await this.findOne(id);
    return this.prisma.utility.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.utility.delete({ where: { id } });
  }

  // Récupérer les properties qui ont cette utility
  async findPropertiesByUtility(id: number) {
    await this.findOne(id);
    const propertyUtilities = await this.prisma.propertyUtility.findMany({
      where: { utilityId: id },
      include: {
        property: {
          include: { category: true, type: true, layout: true, location: true, agent: true, landlord: true },
        },
      },
    });
    return propertyUtilities.map((pu) => pu.property);
  }
}

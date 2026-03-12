import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFacilityDto } from './dto/create-facility.dto';
import { UpdateFacilityDto } from './dto/update-facility.dto';

@Injectable()
export class FacilitiesService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateFacilityDto) {
    return this.prisma.facility.create({ data: dto });
  }

  findAll() {
    return this.prisma.facility.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: number) {
    const facility = await this.prisma.facility.findUnique({ where: { id } });
    if (!facility) throw new NotFoundException('Facility not found');
    return facility;
  }

  async update(id: number, dto: UpdateFacilityDto) {
    await this.findOne(id);
    return this.prisma.facility.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.facility.delete({ where: { id } });
  }

  // Récupérer les properties qui ont cette facility
  async findPropertiesByFacility(id: number) {
    await this.findOne(id);
    const propertyFacilities = await this.prisma.propertyFacility.findMany({
      where: { facilityId: id },
      include: {
        property: {
          include: {
            category: true,
            type: true,
            layout: true,
            location: true,
            agent: true,
            landlord: true,
          },
        },
      },
    });
    return propertyFacilities.map((pf) => pf.property);
  }

  async countFacilities() {
    return {
      total: await this.prisma.facility.count(),
    };
  }
}

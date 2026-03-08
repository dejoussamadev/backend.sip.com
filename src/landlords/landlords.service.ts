import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLandlordDto } from './dto/create-landlord.dto';
import { UpdateLandlordDto } from './dto/update-landlord.dto';

@Injectable()
export class LandlordsService {
  private readonly logger = new Logger(LandlordsService.name);

  constructor(private prisma: PrismaService) {}

  // Créer un landlord
  async create(dto: CreateLandlordDto) {
    const landlord = await this.prisma.landlord.create({ data: dto });
    this.logger.log(`Landlord créé: ${landlord.name} (ID: ${landlord.id})`);
    return landlord;
  }

  // Liste de tous les landlords
  async findAll() {
    return this.prisma.landlord.findMany({
      orderBy: { id: 'desc' },
      include: {
        _count: { select: { properties: true } },
      },
    });
  }

  // Trouver un landlord par ID
  async findOne(id: number) {
    const landlord = await this.prisma.landlord.findUnique({
      where: { id },
      include: {
        properties: {
          select: {
            id: true,
            referenceNumber: true,
            name: true,
            status: true,
          },
        },
      },
    });

    if (!landlord) {
      throw new NotFoundException(`Landlord #${id} introuvable`);
    }

    return landlord;
  }

  // Mettre à jour un landlord
  async update(id: number, dto: UpdateLandlordDto) {
    await this.findOne(id);
    const landlord = await this.prisma.landlord.update({
      where: { id },
      data: dto,
    });
    this.logger.log(`Landlord mis à jour: ID ${id}`);
    return landlord;
  }

  // Supprimer un landlord
  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.landlord.delete({ where: { id } });
    this.logger.log(`Landlord supprimé: ID ${id}`);
    return { message: `Landlord #${id} supprimé avec succès` };
  }
}

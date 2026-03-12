import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLandlordDto } from './dto/create-landlord.dto';
import { UpdateLandlordDto } from './dto/update-landlord.dto';

@Injectable()
export class LandlordsService {
  private readonly logger = new Logger(LandlordsService.name);

  constructor(private prisma: PrismaService) {}

  // Créer un landlord
  async create(dto: CreateLandlordDto) {
    const landlord = await this.prisma.landlord.create({
      data: {
        ...dto,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
      },
    });
    this.logger.log(`Landlord créé: ${landlord.name} (ID: ${landlord.id})`);
    return landlord;
  }

  // Liste de tous les landlords
  async findAll(options: {
    paginate: boolean;
    page: number;
    limit: number;
    search?: string;
  }) {
    const { paginate, page, limit, search } = options;

    const where = search
      ? {
          OR: [{ name: { contains: search, mode: 'insensitive' as const } }],
        }
      : {};

    const include = {
      _count: { select: { properties: true } },
    };

    if (!paginate) {
      return this.prisma.landlord.findMany({
        where,
        orderBy: { id: 'asc' },
        include,
      });
    }

    const skip = (page - 1) * limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.landlord.findMany({
        where,
        orderBy: { id: 'desc' },
        include,
        skip,
        take: limit,
      }),
      this.prisma.landlord.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
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
      data: {
        ...dto,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
      },
    });
    this.logger.log(`Landlord mis à jour: ID ${id}`);
    return landlord;
  }
  // Récupérer les 20 premiers landlords (id + nom) - ADMIN seulement
  async getSimpleList() {
    return this.prisma.landlord.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
      take: 20,
    });
  }

  // Supprimer un landlord
  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.landlord.delete({ where: { id } });
    this.logger.log(`Landlord supprimé: ID ${id}`);
    return { message: `Landlord #${id} supprimé avec succès` };
  }

  async countLandlords() {
    return {
      total: await this.prisma.landlord.count(),
    };
  }
}

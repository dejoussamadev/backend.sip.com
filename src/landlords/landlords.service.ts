import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLandlordDto } from './dto/create-landlord.dto';
import { UpdateLandlordDto } from './dto/update-landlord.dto';
import { normalizePagination } from '../common/utils/pagination.util';

@Injectable()
export class LandlordsService {
  private readonly logger = new Logger(LandlordsService.name);

  constructor(private prisma: PrismaService) {}

  // Créer un landlord
  async create(dto: CreateLandlordDto) {
    const { expiryDate, marketingAgreement, draftContract, ...rest } = dto;
    if (!marketingAgreement) {
      throw new BadRequestException(
        'Le fichier marketingAgreement est requis',
      );
    }

    const landlord = await this.prisma.landlord.create({
      data: {
        ...rest,
        marketingAgreement,
        draftContract: draftContract ?? null,
        expiryDate: new Date(expiryDate),
      },
    });
    this.logger.log(`Landlord créé: ${landlord.name} (ID: ${landlord.id})`);
    return landlord;
  }

  // Liste de tous les landlords
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

    const mapLandlord = ({ _count, ...landlord }: any) => ({
      ...landlord,
      propertiesCount: _count.properties,
    });

    if (!paginate) {
      const data = await this.prisma.landlord.findMany({
        where,
        orderBy: { id: 'asc' },
        include,
      });
      return data.map(mapLandlord);
    }

    const pagination = normalizePagination(page, limit);
    const skip = pagination.skip;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.landlord.findMany({
        where,
        orderBy: { id: 'desc' },
        include,
        skip,
        take: pagination.limit,
      }),
      this.prisma.landlord.count({ where }),
    ]);

    return {
      data: data.map(mapLandlord),
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
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

    const data: any = { ...dto };
    if (dto.expiryDate) {
      data.expiryDate = new Date(dto.expiryDate);
    }
    // Note: expiryDate est maintenant obligatoire, mais pour update on peut ne pas le fournir

    const landlord = await this.prisma.landlord.update({
      where: { id },
      data: data,
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
    const count = await this.prisma.property.count({
      where: { landlordId: id },
    });
    if (count > 0) {
      throw new ConflictException(
        `Cannot delete landlord: ${count} properties are still linked to it`,
      );
    }
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

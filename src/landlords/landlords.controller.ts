// landlords/landlords.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
  Query,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { LandlordsService } from './landlords.service';
import { CreateLandlordDto } from './dto/create-landlord.dto';
import { UpdateLandlordDto } from './dto/update-landlord.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { UploadService } from '../upload/upload.service';
import type { Request } from 'express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

@Controller('landlords')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LandlordsController {
  constructor(
      private readonly landlordsService: LandlordsService,
      private readonly uploadService: UploadService,
  ) {}

  // Créer un landlord
  @Post()
  @Roles(Role.ADMIN, Role.AGENT)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
      FileFieldsInterceptor(
          [
            { name: 'marketingAgreement', maxCount: 1 },
            { name: 'draftContract', maxCount: 1 },
          ],
          {
            storage: diskStorage({
              destination: './uploads/landlords',
              filename: (req, file, cb) => {
                const uniqueSuffix = uuidv4();
                const ext = extname(file.originalname);
                cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
              },
            }),
            fileFilter: (req, file, cb) => {
              const allowedMimes = [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              ];
              if (allowedMimes.includes(file.mimetype)) {
                cb(null, true);
              } else {
                cb(new BadRequestException('Type de fichier non autorisé. Utilisez PDF ou DOC'), false);
              }
            },
            limits: {
              fileSize: 10 * 1024 * 1024, // 10MB
            },
          },
      ),
  )
  async create(
      @UploadedFiles() files: {
        marketingAgreement?: Express.Multer.File[];
        draftContract?: Express.Multer.File[];
      },
      @Body() createLandlordDto: CreateLandlordDto,
      @Req() req: Request,
  ) {
    // Vérifier que les fichiers sont présents
    if (!files?.marketingAgreement?.[0]) {
      throw new BadRequestException('Le fichier marketingAgreement est requis');
    }
    if (!files?.draftContract?.[0]) {
      throw new BadRequestException('Le fichier draftContract est requis');
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;

    try {
      // Utiliser UploadService pour générer les URLs
      const marketingUrl = this.uploadService.getUrl(files.marketingAgreement[0], baseUrl);
      const draftUrl = this.uploadService.getUrl(files.draftContract[0], baseUrl);

      // Créer l'objet avec les données + URLs des fichiers
      const landlordData: CreateLandlordDto = {
        ...createLandlordDto,
        marketingAgreement: marketingUrl,
        draftContract: draftUrl,
      };

      // Créer le landlord (le service convertira expiryDate en Date)
      const landlord = await this.landlordsService.create(landlordData);

      return {
        success: true,
        message: 'Propriétaire créé avec succès',
        data: landlord,
      };
    } catch (error) {
      // En cas d'erreur, supprimer les fichiers uploadés
      this.uploadService.rollback([
        files.marketingAgreement[0],
        files.draftContract[0],
      ]);
      throw error;
    }
  }

  // Liste de tous les landlords
  @Get()
  @Roles(Role.ADMIN, Role.AGENT)
  findAll(
      @Query('with_pagination') withPagination?: string,
      @Query('page') page?: string,
      @Query('limit') limit?: string,
      @Query('search') search?: string,
  ) {
    const paginate = withPagination === 'true';
    return this.landlordsService.findAll({
      paginate,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      search: search?.trim() || undefined,
    });
  }

  // Récupérer les 20 premiers landlords (id + nom)
  @Get('list/simple')
  @Roles(Role.ADMIN)
  getSimpleList() {
    return this.landlordsService.getSimpleList();
  }

  @Get('count')
  @HttpCode(HttpStatus.OK)
  countLandlords() {
    return this.landlordsService.countLandlords();
  }

  // Trouver un landlord par ID
  @Get(':id')
  @Roles(Role.ADMIN, Role.AGENT)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.landlordsService.findOne(id);
  }

  // Mettre à jour un landlord
  @Patch(':id')
  @Roles(Role.ADMIN, Role.AGENT)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
      FileFieldsInterceptor([
        { name: 'marketingAgreement', maxCount: 1 },
        { name: 'draftContract', maxCount: 1 },
      ]),
  )
  async update(
      @Param('id', ParseIntPipe) id: number,
      @Body() updateLandlordDto: UpdateLandlordDto,
      @UploadedFiles()
          files: {
        marketingAgreement?: Express.Multer.File[];
        draftContract?: Express.Multer.File[];
      },
      @Req() req: Request,
  ) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    try {
      // Préparer les données de mise à jour
      const updateData: any = { ...updateLandlordDto };

      // Traiter les nouveaux fichiers s'ils sont fournis
      if (files?.marketingAgreement?.[0]) {
        updateData.marketingAgreement = this.uploadService.getUrl(files.marketingAgreement[0], baseUrl);
      }

      if (files?.draftContract?.[0]) {
        updateData.draftContract = this.uploadService.getUrl(files.draftContract[0], baseUrl);
      }

      return this.landlordsService.update(id, updateData);
    } catch (error) {
      // En cas d'erreur, supprimer les nouveaux fichiers uploadés
      const filesToDelete: Express.Multer.File[] = [];

      if (files?.marketingAgreement?.[0]) {
        filesToDelete.push(files.marketingAgreement[0]);
      }
      if (files?.draftContract?.[0]) {
        filesToDelete.push(files.draftContract[0]);
      }

      if (filesToDelete.length > 0) {
        this.uploadService.rollback(filesToDelete);
      }

      throw error;
    }
  }

  // Supprimer un landlord
  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    // Récupérer le landlord pour avoir les chemins des fichiers
    const landlord = await this.landlordsService.findOne(id);

    // Supprimer le landlord
    const result = await this.landlordsService.remove(id);

    // Supprimer les fichiers associés
    if (landlord.marketingAgreement) {
      try {
        // Extraire le chemin du fichier de l'URL
        const filePath = landlord.marketingAgreement.replace(/^.*\/uploads/, './uploads');
        this.uploadService.deleteFile(filePath);
      } catch (e) {
        console.log('Erreur lors de la suppression du fichier marketingAgreement');
      }
    }

    if (landlord.draftContract) {
      try {
        const filePath = landlord.draftContract.replace(/^.*\/uploads/, './uploads');
        this.uploadService.deleteFile(filePath);
      } catch (e) {
        console.log('Erreur lors de la suppression du fichier draftContract');
      }
    }

    return result;
  }
}
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
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import type { File as MulterFile } from 'multer';
import { LandlordsService } from './landlords.service';
import { CreateLandlordDto } from './dto/create-landlord.dto';
import { UpdateLandlordDto } from './dto/update-landlord.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

const storage = diskStorage({
  destination: './uploads/landlords',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
  },
});

@Controller('landlords')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LandlordsController {
  constructor(private readonly landlordsService: LandlordsService) {}

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
      { storage },
    ),
  )
  create(
    @Body() createLandlordDto: CreateLandlordDto,
    @UploadedFiles()
    files: {
      marketingAgreement?: MulterFile[];
      draftContract?: MulterFile[];
    },
  ) {
    if (files?.marketingAgreement?.[0]) {
      createLandlordDto.marketingAgreement = files.marketingAgreement[0].path;
    }
    if (files?.draftContract?.[0]) {
      createLandlordDto.draftContract = files.draftContract[0].path;
    }
    return this.landlordsService.create(createLandlordDto);
  }

  // Liste de tous les landlords
  @Get()
  @Roles(Role.ADMIN, Role.AGENT)
  findAll() {
    return this.landlordsService.findAll();
  }
// Récupérer les 20 premiers landlords (id + nom)
  @Get('list/simple')
  @Roles(Role.ADMIN)
  getSimpleList() {
    return this.landlordsService.getSimpleList();
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
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'marketingAgreement', maxCount: 1 },
        { name: 'draftContract', maxCount: 1 },
      ],
      { storage },
    ),
  )
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLandlordDto: UpdateLandlordDto,
    @UploadedFiles()
    files: {
      marketingAgreement?: MulterFile[];
      draftContract?: MulterFile[];
    },
  ) {
    if (files?.marketingAgreement?.[0]) {
      updateLandlordDto.marketingAgreement = files.marketingAgreement[0].path;
    }
    if (files?.draftContract?.[0]) {
      updateLandlordDto.draftContract = files.draftContract[0].path;
    }
    return this.landlordsService.update(id, updateLandlordDto);
  }

  // Supprimer un landlord
  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.landlordsService.remove(id);
  }
}



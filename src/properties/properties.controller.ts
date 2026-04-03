import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Put,
} from '@nestjs/common';
import type { Request } from 'express';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { PropertyFilesInterceptor } from '../upload/interceptors/file-upload.interceptor';

@Controller('properties')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  private applyUploadedFiles(
    dto: CreatePropertyDto | UpdatePropertyDto,
    files?: { images?: Express.Multer.File[]; documents?: Express.Multer.File[] },
  ) {
    if (files?.images?.length) {
      dto.imageUrls = files.images.map((f) => f.path);
    }
    if (files?.documents?.length) {
      dto.documents = files.documents.map((f) => f.path);
    }
  }

  @Post()
  @Roles(Role.ADMIN, Role.AGENT)
  @UseInterceptors(PropertyFilesInterceptor('images', 'documents'))
  create(
    @Body() dto: CreatePropertyDto,
    @UploadedFiles()
    files: {
      images?: Express.Multer.File[];
      documents?: Express.Multer.File[];
    },
    @Req() req: Request,
  ) {
    this.applyUploadedFiles(dto, files);
    const user = req.user as any;
    const agentName = user?.name ?? 'Unknown';
    const userRole = user?.role as Role | undefined;
    if (userRole === Role.AGENT) {
      // Les users ne peuvent pas forcer le statut
      delete dto.status;
    }
    return this.propertiesService.create(dto, agentName, userRole);
  }

  @Get()
  @Roles(Role.ADMIN, Role.AGENT)
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('keyword') keyword?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('typeId') typeId?: string,
    @Query('category') category?: string,
    @Query('categoryId') categoryId?: string,
    @Query('layoutId') layoutId?: string,
    @Query('locationCode') locationCode?: string,
    @Query('locationId') locationId?: string,
    @Query('furnishingId') furnishingId?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('minAmount') minAmount?: string,
    @Query('maxAmount') maxAmount?: string,
    @Query('minSize') minSize?: string,
    @Query('maxSize') maxSize?: string,
    @Query('bedrooms') bedrooms?: string,
    @Query('bathrooms') bathrooms?: string,
    @Query('maidRoom') maidRoom?: string,
    @Query('shortTerm') shortTerm?: string,
    @Query('utilitiesIncluded') utilitiesIncluded?: string,
    @Query('balcony') balcony?: string,
    @Query('view') view?: string,
    @Query('facilityId') facilityId?: string,
    @Query('agentId') agentId?: string,
    @Query('landlordId') landlordId?: string,
  ) {
    return this.propertiesService.findAll({
      page,
      limit,
      skip,
      take,
      keyword,
      status,
      type,
      typeId,
      category,
      categoryId,
      layoutId,
      locationCode,
      locationId,
      furnishingId,
      minPrice,
      maxPrice,
      minAmount,
      maxAmount,
      minSize,
      maxSize,
      bedrooms,
      bathrooms,
      maidRoom,
      shortTerm,
      utilitiesIncluded,
      balcony,
      view,
      facilityId,
      agentId,
      landlordId,
    });
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.AGENT)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.propertiesService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @UseInterceptors(PropertyFilesInterceptor('images', 'documents'))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePropertyDto,
    @UploadedFiles()
    files: { images?: Express.Multer.File[]; documents?: Express.Multer.File[] },
    @Req() req: Request,
  ) {
    this.applyUploadedFiles(dto, files);
    const agentName = (req.user as any)?.name ?? 'Unknown';
    return this.propertiesService.update(id, dto, agentName);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @UseInterceptors(PropertyFilesInterceptor('images', 'documents'))
  replace(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePropertyDto,
    @UploadedFiles()
    files: { images?: Express.Multer.File[]; documents?: Express.Multer.File[] },
    @Req() req: Request,
  ) {
    this.applyUploadedFiles(dto, files);
    const agentName = (req.user as any)?.name ?? 'Unknown';
    return this.propertiesService.replace(id, dto, agentName);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.propertiesService.remove(id);
  }
}

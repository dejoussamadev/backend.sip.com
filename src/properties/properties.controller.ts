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
    if (files?.images?.length) {
      dto.imageUrls = files.images.map((f) => f.path);
    }
    if (files?.documents?.length) {
      dto.documents = files.documents.map((f) => f.path);
    }
    const agentName = (req.user as any)?.name ?? 'Unknown';
    return this.propertiesService.create(dto, agentName);
  }
  @Post('filter')
  async filterProperties(@Body() filters: Record<string, any>) {
    return this.propertiesService.advancedSearch(filters);
  }

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('category') category?: string,
    @Query('locationCode') locationCode?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('bedrooms') bedrooms?: string,
    @Query('bathrooms') bathrooms?: string,
    @Query('agentId') agentId?: string,
    @Query('landlordId') landlordId?: string,
  ) {
    return this.propertiesService.findAll({
      page,
      limit,
      status,
      type,
      category,
      locationCode,
      minPrice,
      maxPrice,
      bedrooms,
      bathrooms,
      agentId,
      landlordId,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.propertiesService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.AGENT)
  @UseInterceptors(PropertyFilesInterceptor('images', 'documents'))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePropertyDto,
    @UploadedFiles()
    files: { images?: Express.Multer.File[]; documents?: Express.Multer.File[] },
    @Req() req: Request,
  ) {
    if (files?.images?.length) {
      dto.imageUrls = files.images.map((f) => f.path);
    }
    if (files?.documents?.length) {
      dto.documents = files.documents.map((f) => f.path);
    }
    const agentName = (req.user as any)?.name ?? 'Unknown';
    return this.propertiesService.update(id, dto, agentName);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.propertiesService.remove(id);
  }
}

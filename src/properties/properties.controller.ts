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
} from '@nestjs/common';
import type { Request } from 'express';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('properties')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.AGENT)
  create(@Body() dto: CreatePropertyDto, @Req() req: Request) {
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
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePropertyDto,
    @Req() req: Request,
  ) {
    const agentName = (req.user as any)?.name ?? 'Unknown';
    return this.propertiesService.update(id, dto, agentName);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.propertiesService.remove(id);
  }
}

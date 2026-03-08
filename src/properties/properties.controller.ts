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
  UseGuards,
} from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CATEGORY_TO_TYPES,
  TYPE_TO_LAYOUTS,
} from './constants/property.options';
import {
  BalconyOption,
  StatusOption,
  AccessOption,
  FurnishingOption,
} from './constants/property.enums';
import { PropertyView, Role } from '@prisma/client';

@Controller('properties')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.AGENT)
  create(@Body() dto: CreatePropertyDto) {
    return this.propertiesService.create(dto);
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
  ) {
    return this.propertiesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.propertiesService.remove(id);
  }

  @Get('options/categories')
  getCategories() {
    return Object.keys(CATEGORY_TO_TYPES);
  }

  @Get('options/types')
  getTypes(@Query('category') category?: string) {
    if (category && CATEGORY_TO_TYPES[category])
      return CATEGORY_TO_TYPES[category];
    return Array.from(new Set(Object.values(CATEGORY_TO_TYPES).flat()));
  }

  @Get('options/layouts')
  getLayouts(@Query('type') type?: string) {
    if (type && TYPE_TO_LAYOUTS[type]) return TYPE_TO_LAYOUTS[type];
    return Array.from(new Set(Object.values(TYPE_TO_LAYOUTS).flat()));
  }

  @Get('options/balcony')
  getBalcony() {
    return Object.values(BalconyOption);
  }

  @Get('options/view')
  getView() {
    return Object.values(PropertyView);
  }

  @Get('options/status')
  getStatus() {
    return Object.values(StatusOption);
  }

  @Get('options/access')
  getAccess() {
    return Object.values(AccessOption);
  }

  @Get('options/furnishing')
  getFurnishing() {
    return Object.values(FurnishingOption);
  }

  // Liste des landlords pour le dropdown
  @Get('options/landlords')
  @Roles(Role.ADMIN, Role.AGENT)
  getLandlords() {
    return this.propertiesService.getLandlords();
  }

  // Liste des agents pour le dropdown
  @Get('options/agents')
  @Roles(Role.ADMIN, Role.AGENT)
  getAgents() {
    return this.propertiesService.getAgents();
  }
}

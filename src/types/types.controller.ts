import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  UseGuards, ParseIntPipe, HttpCode, HttpStatus,
  Query,
} from '@nestjs/common';
import { TypesService } from './types.service';
import { CreateTypeDto } from './dto/create-type.dto';
import { UpdateTypeDto } from './dto/update-type.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('types')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TypesController {
  constructor(private readonly typesService: TypesService) {}

  @Post()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateTypeDto) {
    return this.typesService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.AGENT)
  findAll(
    @Query('with_pagination') withPagination?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const paginate = withPagination === 'true';
    return this.typesService.findAll({
      paginate,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      search: search?.trim() || undefined,
    });
  }

  @Get('count')
  @HttpCode(HttpStatus.OK)
  countTypes() {
    return this.typesService.countTypes();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.AGENT)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.typesService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTypeDto) {
    return this.typesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.typesService.remove(id);
  }

  // GET /types/:id/properties
  @Get(':id/properties')
  @Roles(Role.ADMIN, Role.AGENT)
  findProperties(@Param('id', ParseIntPipe) id: number) {
    return this.typesService.findPropertiesByType(id);
  }

  // GET /types/:id/layouts
  @Get(':id/layouts')
  @Roles(Role.ADMIN, Role.AGENT)
  findLayouts(@Param('id', ParseIntPipe) id: number) {
    return this.typesService.findLayoutsByType(id);
  }

  // GET /types/:id/categories
  @Get('by-category/:id')
  @Roles(Role.ADMIN, Role.AGENT)
  findCategories(@Param('id', ParseIntPipe) id: number) {
    return this.typesService.findTypesByCategory(id);
  }
}

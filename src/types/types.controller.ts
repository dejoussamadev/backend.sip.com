import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  UseGuards, ParseIntPipe, HttpCode, HttpStatus,
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
  findAll() {
    return this.typesService.findAll();
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
  @Get(':id/categories')
  @Roles(Role.ADMIN, Role.AGENT)
  findCategories(@Param('id', ParseIntPipe) id: number) {
    return this.typesService.findCategoriesByType(id);
  }
}

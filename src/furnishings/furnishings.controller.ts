import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  UseGuards, ParseIntPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { FurnishingsService } from './furnishings.service';
import { CreateFurnishingDto } from './dto/create-furnishing.dto';
import { UpdateFurnishingDto } from './dto/update-furnishing.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('furnishings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FurnishingsController {
  constructor(private readonly furnishingsService: FurnishingsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateFurnishingDto) {
    return this.furnishingsService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.AGENT)
  findAll() {
    return this.furnishingsService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.AGENT)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.furnishingsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFurnishingDto) {
    return this.furnishingsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.furnishingsService.remove(id);
  }

  // GET /furnishings/:id/properties
  @Get(':id/properties')
  @Roles(Role.ADMIN, Role.AGENT)
  findProperties(@Param('id', ParseIntPipe) id: number) {
    return this.furnishingsService.findPropertiesByFurnishing(id);
  }

  // GET /furnishings/:id/categories
  @Get(':id/categories')
  @Roles(Role.ADMIN, Role.AGENT)
  findCategories(@Param('id', ParseIntPipe) id: number) {
    return this.furnishingsService.findCategoriesByFurnishing(id);
  }
}

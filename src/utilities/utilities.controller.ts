import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  UseGuards, ParseIntPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { UtilitiesService } from './utilities.service';
import { CreateUtilityDto } from './dto/create-utility.dto';
import { UpdateUtilityDto } from './dto/update-utility.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('utilities')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UtilitiesController {
  constructor(private readonly utilitiesService: UtilitiesService) {}

  @Post()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateUtilityDto) {
    return this.utilitiesService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.AGENT)
  findAll() {
    return this.utilitiesService.findAll();
  }

  @Get('count')
  @HttpCode(HttpStatus.OK)
  countUtilities() {
    return this.utilitiesService.countUtilities();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.AGENT)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.utilitiesService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUtilityDto) {
    return this.utilitiesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.utilitiesService.remove(id);
  }

  // GET /utilities/:id/properties
  @Get(':id/properties')
  @Roles(Role.ADMIN, Role.AGENT)
  findProperties(@Param('id', ParseIntPipe) id: number) {
    return this.utilitiesService.findPropertiesByUtility(id);
  }
}

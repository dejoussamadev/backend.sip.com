import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  UseGuards, ParseIntPipe, HttpCode, HttpStatus,
  Query,
} from '@nestjs/common';
import { LocationsService } from './locations.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('locations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateLocationDto) {
    return this.locationsService.create(dto);
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
    return this.locationsService.findAll({
      paginate,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      search: search?.trim() || undefined,
    });
  }

  @Get('count')
  @HttpCode(HttpStatus.OK)
  countLocations() {
    return this.locationsService.countLocations();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.AGENT)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.locationsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateLocationDto) {
    return this.locationsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.locationsService.remove(id);
  }

  // GET /locations/:id/properties
  @Get(':id/properties')
  @Roles(Role.ADMIN, Role.AGENT)
  findProperties(@Param('id', ParseIntPipe) id: number) {
    return this.locationsService.findPropertiesByLocation(id);
  }
}

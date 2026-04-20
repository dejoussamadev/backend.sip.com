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
  Query,
} from '@nestjs/common';
import { FacilitiesService } from './facilities.service';
import { CreateFacilityDto } from './dto/create-facility.dto';
import { UpdateFacilityDto } from './dto/update-facility.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('facilities')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FacilitiesController {
  constructor(private readonly facilitiesService: FacilitiesService) {}

  @Post()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateFacilityDto) {
    return this.facilitiesService.create(dto);
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
    return this.facilitiesService.findAll({
      paginate,
      page,
      limit,
      search: search?.trim() || undefined,
    });
  }

  @Get('count')
  @HttpCode(HttpStatus.OK)
  countFacilities() {
    return this.facilitiesService.countFacilities();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.AGENT)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.facilitiesService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFacilityDto,
  ) {
    return this.facilitiesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.facilitiesService.remove(id);
  }

  // GET /facilities/:id/properties
  @Get(':id/properties')
  @Roles(Role.ADMIN, Role.AGENT)
  findProperties(@Param('id', ParseIntPipe) id: number) {
    return this.facilitiesService.findPropertiesByFacility(id);
  }
}

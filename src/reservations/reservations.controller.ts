import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ReservationsService } from './reservations.service';
import { CreateReservationLinkDto } from './dto/create-reservation-link.dto';
import { SubmitReservationDto } from './dto/submit-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { RejectReservationDto } from './dto/reject-reservation.dto';
import { ReservationQueryDto } from './dto/reservation-query.dto';
import {
  ConsultantSignatureInterceptor,
  ReservationFilesInterceptor,
} from './interceptors/reservation-files.interceptor';

@Controller('reservations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post('links')
  @Roles(Role.ADMIN, Role.AGENT)
  @UseInterceptors(ConsultantSignatureInterceptor())
  generateLink(
    @Body() dto: CreateReservationLinkDto,
    @UploadedFiles() files: any,
    @CurrentUser() currentUser: { id: number; role: Role },
  ) {
    const signatureUrl: string = files?.consultantSignature?.[0]?.path ?? '';
    return this.reservationsService.generateLink(
      dto.propertyId,
      currentUser,
      signatureUrl,
      dto.unitNumber,
    );
  }

  @Post()
  @Roles(Role.ADMIN, Role.AGENT)
  @UseInterceptors(ReservationFilesInterceptor())
  create(
    @Body() dto: SubmitReservationDto,
    @UploadedFiles() files: any,
    @CurrentUser() currentUser: { id: number; role: Role },
  ) {
    return this.reservationsService.submitInternal(dto, files, currentUser);
  }

  @Get()
  @Roles(Role.ADMIN, Role.AGENT)
  findAll(
    @Query() query: ReservationQueryDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.reservationsService.findAll(query, currentUser);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.AGENT)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: any,
  ) {
    return this.reservationsService.findOne(id, currentUser);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @UseInterceptors(ReservationFilesInterceptor())
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReservationDto,
    @UploadedFiles() files: any,
  ) {
    return this.reservationsService.update(id, dto, files);
  }

  @Post(':id/approve')
  @Roles(Role.ADMIN)
  approve(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') approverId: number,
  ) {
    return this.reservationsService.approve(id, approverId);
  }

  @Post(':id/reject')
  @Roles(Role.ADMIN)
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectReservationDto,
    @CurrentUser('id') approverId: number,
  ) {
    return this.reservationsService.reject(id, approverId, dto.reason);
  }
}

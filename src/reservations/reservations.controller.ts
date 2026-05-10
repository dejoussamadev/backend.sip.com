import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
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
    @Req() req: Request,
  ) {
    const user = req.user as any;
    const signatureUrl: string =
      files?.consultantSignature?.[0]?.path ?? '';
    return this.reservationsService.generateLink(
      dto.propertyId,
      user.id,
      signatureUrl,
    );
  }

  @Post()
  @Roles(Role.ADMIN, Role.AGENT)
  @UseInterceptors(ReservationFilesInterceptor())
  create(
    @Body() dto: SubmitReservationDto,
    @UploadedFiles() files: any,
    @Req() req: Request,
  ) {
    const user = req.user as any;
    return this.reservationsService.submitInternal(dto, files, user.id);
  }

  @Get()
  @Roles(Role.ADMIN, Role.AGENT)
  findAll(@Query() query: ReservationQueryDto, @Req() req: Request) {
    const user = req.user as any;
    return this.reservationsService.findAll(query, user);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.AGENT)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ) {
    const user = req.user as any;
    return this.reservationsService.findOne(id, user);
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
    @Req() req: Request,
  ) {
    const user = req.user as any;
    return this.reservationsService.approve(id, user.id);
  }

  @Post(':id/reject')
  @Roles(Role.ADMIN)
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectReservationDto,
    @Req() req: Request,
  ) {
    const user = req.user as any;
    return this.reservationsService.reject(id, user.id, dto.reason);
  }
}

import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { ReservationsService } from './reservations.service';
import { SubmitPublicReservationDto } from './dto/submit-public-reservation.dto';
import { ReservationLinkGuard } from './guards/reservation-link.guard';
import { ReservationFilesInterceptor } from './interceptors/reservation-files.interceptor';

@Controller('public/reservations')
@UseGuards(ReservationLinkGuard)
export class ReservationsPublicController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Get('context')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  getContext(@Req() req: Request) {
    return this.reservationsService.getPublicContext(
      (req as any).reservationLink,
    );
  }

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseInterceptors(ReservationFilesInterceptor())
  submitPublic(
    @Body() dto: SubmitPublicReservationDto,
    @UploadedFiles() files: any,
    @Req() req: Request,
  ) {
    return this.reservationsService.submitPublic(
      dto,
      files,
      (req as any).reservationLink,
    );
  }
}

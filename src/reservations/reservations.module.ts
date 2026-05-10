import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ErrorsModule } from '../common/errors/errors.module';
import { ReservationsController } from './reservations.controller';
import { ReservationsPublicController } from './reservations-public.controller';
import { ReservationsService } from './reservations.service';
import { ReservationLinkGuard } from './guards/reservation-link.guard';

@Module({
  imports: [PrismaModule, NotificationsModule, ErrorsModule],
  controllers: [ReservationsController, ReservationsPublicController],
  providers: [ReservationsService, ReservationLinkGuard],
})
export class ReservationsModule {}

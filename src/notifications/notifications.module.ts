import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsStreamService } from './notifications-stream.service';
import { EmailService } from './email.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, EmailService, NotificationsStreamService],
  exports: [NotificationsService, NotificationsStreamService, EmailService],
})
export class NotificationsModule {}

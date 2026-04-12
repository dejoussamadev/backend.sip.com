import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { LoginRequestsController } from './login-requests.controller';
import { LoginRequestsService } from './login-requests.service';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [LoginRequestsController],
  providers: [LoginRequestsService],
  exports: [LoginRequestsService],
})
export class LoginRequestsModule {}

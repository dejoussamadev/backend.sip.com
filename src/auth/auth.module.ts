import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { StringValue } from 'ms';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LoginRequestsModule } from '../login-requests/login-requests.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { getJwtSecret } from './jwt-secret';

const jwtExpiration = (process.env.JWT_EXPIRATION || '7d') as StringValue;

@Module({
  imports: [
    PrismaModule,
    LoginRequestsModule,
    NotificationsModule,
    PassportModule,
    JwtModule.register({
      global: true,
      secret: getJwtSecret(),
      signOptions: { expiresIn: jwtExpiration },
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}

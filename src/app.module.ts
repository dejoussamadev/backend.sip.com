import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ErrorsModule } from './common/errors/errors.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PropertiesModule } from './properties/properties.module';
import { LandlordsModule } from './landlords/landlords.module';
import { CategoriesModule } from './categories/categories.module';
import { TypesModule } from './types/types.module';
import { LayoutsModule } from './layouts/layouts.module';
import { LocationsModule } from './locations/locations.module';
import { FurnishingsModule } from './furnishings/furnishings.module';
import { FacilitiesModule } from './facilities/facilities.module';
import { UtilitiesModule } from './utilities/utilities.module';
import { NotificationsModule } from './notifications/notifications.module';
import { UploadModule } from './upload/upload.module';
import { UsersModule } from './users/users.module';
import { LoginRequestsModule } from './login-requests/login-requests.module';
import { StatisticsModule } from './statistics/statistics.module';
import { ReservationsModule } from './reservations/reservations.module';
import { envValidationSchema } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false,
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),
    ErrorsModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    PropertiesModule,
    LandlordsModule,
    CategoriesModule,
    TypesModule,
    LayoutsModule,
    LocationsModule,
    FurnishingsModule,
    FacilitiesModule,
    UtilitiesModule,
    NotificationsModule,
    LoginRequestsModule,
    StatisticsModule,
    ReservationsModule,
    UploadModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AgentsModule } from './agents/agents.module';
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


@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AgentsModule,
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
    UploadModule,

  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

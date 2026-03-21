import { Module } from '@nestjs/common';
import { LandlordsService } from './landlords.service';
import { LandlordsController } from './landlords.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadModule } from '../upload/upload.module';


@Module({
  imports: [PrismaModule, UploadModule],

  controllers: [LandlordsController],
  providers: [LandlordsService],
  exports: [LandlordsService],
})
export class LandlordsModule {}

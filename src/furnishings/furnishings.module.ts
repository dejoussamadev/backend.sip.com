import { Module } from '@nestjs/common';
import { FurnishingsService } from './furnishings.service';
import { FurnishingsController } from './furnishings.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FurnishingsController],
  providers: [FurnishingsService],
  exports: [FurnishingsService],
})
export class FurnishingsModule {}

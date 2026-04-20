import { Module } from '@nestjs/common';
import { LayoutsService } from './layouts.service';
import { LayoutsController } from './layouts.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LayoutsController],
  providers: [LayoutsService],
  exports: [LayoutsService],
})
export class LayoutsModule {}

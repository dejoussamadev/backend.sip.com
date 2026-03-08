import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AgentsModule } from './agents/agents.module';
import { PropertiesModule } from './properties/properties.module';
import { LandlordsModule } from './landlords/landlords.module';


@Module({
  imports: [PrismaModule, AuthModule, AgentsModule, PropertiesModule, LandlordsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

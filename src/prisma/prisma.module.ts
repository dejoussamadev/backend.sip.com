import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // ✅ Rendre le module global pour éviter de l'importer partout
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
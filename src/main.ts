import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // ✅ Cookie parser for httpOnly JWT cookies
  app.use(cookieParser());

  // ✅ Validation globale des DTOs
  app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,           // Supprime les propriétés non définies dans le DTO
        forbidNonWhitelisted: true, // Rejette les requêtes avec des propriétés inconnues
        transform: true,           // Transforme automatiquement les types
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
  );

  // ✅ CORS pour le frontend Angular
  const corsOrigins = process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
      : ['http://localhost:4200'];

  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  });

  // ✅ Préfixe global pour l'API (optionnel mais recommandé)
  // Toutes les routes commenceront par /api
  // app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  logger.log(`🚀 Application démarrée sur: http://localhost:${port}`);
}

bootstrap();
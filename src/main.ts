import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

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
  app.enableCors({
    origin: ['http://localhost:4200'],
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
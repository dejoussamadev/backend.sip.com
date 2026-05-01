import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Trust the first hop proxy (nginx in the prod `client` container). Lets
  // Express read X-Forwarded-Proto / X-Forwarded-For so `req.protocol` and
  // `req.ip` reflect the original client request instead of the internal
  // hop, which matters for upload URL building and rate-limit accounting.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // ✅ Cookie parser for httpOnly JWT cookies
  app.use(cookieParser());

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

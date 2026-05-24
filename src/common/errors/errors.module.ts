import { Global, Module } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ErrorCatalogService } from './error-catalog.service';
import { createValidationExceptionFactory } from './validation-exception.factory';

/**
 * Global module that:
 * - Provides `ErrorCatalogService` (reads `error-codes.yml` at boot).
 * - Registers the app-wide `ValidationPipe` via `APP_PIPE` so the pipe can
 *   inject `ErrorCatalogService` and resolve codes to human-readable text.
 *
 * The catalog is no longer exposed over HTTP — the frontend ships its own
 * copy as a static asset (synced from this YAML at build time).
 */
@Global()
@Module({
  providers: [
    ErrorCatalogService,
    {
      provide: APP_PIPE,
      useFactory: (catalog: ErrorCatalogService) =>
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
          transformOptions: { enableImplicitConversion: true },
          exceptionFactory: createValidationExceptionFactory(catalog),
        }),
      inject: [ErrorCatalogService],
    },
  ],
  exports: [ErrorCatalogService],
})
export class ErrorsModule {}

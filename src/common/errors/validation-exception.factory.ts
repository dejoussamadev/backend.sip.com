import { ValidationError } from '@nestjs/common';
import { AppValidationException, AppErrorEntry } from './app-validation.exception';
import { ErrorCatalogService } from './error-catalog.service';

/**
 * Returns the `exceptionFactory` for `ValidationPipe`.
 *
 * Each DTO decorator carries a catalog code as its `message` option
 * (e.g. `@IsNumber({}, { message: 'PROPERTY_PRICE_REQUIRED' })`).
 * This factory resolves those codes into human-readable strings via the
 * catalog and returns a structured `AppValidationException`.
 */
export function createValidationExceptionFactory(catalog: ErrorCatalogService) {
  return (errors: ValidationError[]): AppValidationException => {
    const flat: AppErrorEntry[] = [];

    const walk = (errs: ValidationError[], parentPath: string) => {
      for (const e of errs) {
        const field = parentPath ? `${parentPath}.${e.property}` : e.property;
        if (e.constraints) {
          // First constraint wins per field — only one message per field in the alert.
          const code = Object.values(e.constraints)[0];
          flat.push({ field, code, message: catalog.getMessage(code, 'GENERIC_VALIDATION_FAILED') });
        }
        if (e.children?.length) walk(e.children, field);
      }
    };

    walk(errors, '');
    return new AppValidationException(flat);
  };
}

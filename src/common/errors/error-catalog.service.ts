import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { load } from 'js-yaml';

/**
 * Loads the error-code → human-readable-message catalog from `error-codes.yml`
 * at module init. Used by the ValidationPipe factory and AppValidationException
 * to resolve codes into text before sending them to the client.
 */
@Injectable()
export class ErrorCatalogService implements OnModuleInit {
  private readonly logger = new Logger(ErrorCatalogService.name);
  private catalog: Record<string, string> = {};

  onModuleInit() {
    const path = join(__dirname, 'error-codes.yml');
    const raw = readFileSync(path, 'utf8');
    this.catalog = (load(raw) ?? {}) as Record<string, string>;
    this.logger.log(`Loaded ${Object.keys(this.catalog).length} error codes`);
  }

  /**
   * Returns the human-readable message for `code`, falling back to the
   * message for `fallbackCode`, and finally returning `code` itself so the
   * response always contains something readable.
   */
  getMessage(code: string, fallbackCode = 'GENERIC_BAD_REQUEST'): string {
    return this.catalog[code] ?? this.catalog[fallbackCode] ?? code;
  }
}

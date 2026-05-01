import { BadRequestException } from '@nestjs/common';
import { ErrorCatalogService } from './error-catalog.service';

export interface AppErrorEntry {
  /** The DTO field path (e.g. `commissionPct`, `type`). */
  field?: string;
  /** Stable code from `error-codes.yml` (e.g. `PROPERTY_COMMISSION_RANGE`). */
  code: string;
  /** Resolved human-readable message — filled server-side from the catalog. */
  message?: string;
}

/**
 * Structured 400 exception used for both DTO validation failures and
 * service-level domain rule violations. Produces the response shape:
 *
 * ```json
 * {
 *   "statusCode": 400,
 *   "error": "Bad Request",
 *   "errors": [{ "field": "commissionPct", "code": "PROPERTY_COMMISSION_RANGE", "message": "..." }]
 * }
 * ```
 */
export class AppValidationException extends BadRequestException {
  constructor(public readonly entries: AppErrorEntry[]) {
    super({ statusCode: 400, error: 'Bad Request', errors: entries });
  }

  /** Resolves each entry's `message` from the catalog before throwing. */
  static from(catalog: ErrorCatalogService, entries: Omit<AppErrorEntry, 'message'>[]): AppValidationException {
    return new AppValidationException(
      entries.map((e) => ({ ...e, message: catalog.getMessage(e.code) })),
    );
  }
}

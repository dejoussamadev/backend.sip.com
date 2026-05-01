import { registerDecorator, ValidationOptions } from 'class-validator';

/**
 * Validates that the decorated `Date` field is today or later.
 * Unlike `@MinDate(new Date())`, this evaluates "now" at validation time
 * rather than at module-load time, so the boundary doesn't drift as the
 * server stays up.
 *
 * Time-of-day is ignored — a date matching today's date always passes.
 */
export function MinDateNow(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'minDateNow',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (value === undefined || value === null) return true; // @IsOptional handles absence
          const d = value instanceof Date ? value : new Date(value as string);
          if (isNaN(d.getTime())) return false;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return d.getTime() >= today.getTime();
        },
        defaultMessage(): string {
          return 'PROPERTY_EXPIRY_PAST';
        },
      },
    });
  };
}

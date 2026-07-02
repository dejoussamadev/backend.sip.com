import { Transform, Type } from 'class-transformer';
import { parseBool } from './parse-bool.util';

/**
 * Coerces incoming values into a real boolean for DTO fields.
 *
 * Handles multipart/query string values ("true" / "false" / "1" / "0") as well
 * as genuine JSON booleans, and leaves omitted fields as `undefined` (so
 * PartialType update semantics are preserved).
 *
 * IMPORTANT — why `@Type(() => String)` is required:
 * The global ValidationPipe runs with `transformOptions.enableImplicitConversion:
 * true`. For a field whose reflected type is `boolean`, class-transformer applies
 * `Boolean(value)` *before* any `@Transform` runs — and `Boolean("false") === true`,
 * so a multipart "false" would be stored as `true`. Declaring the incoming type as
 * `String` sends class-transformer down its explicit-type path instead, turning that
 * step into a lossless `String(value)`, after which `parseBool` can read the original
 * "true"/"false" text. A bare `@Transform(parseBool)` does NOT work under implicit
 * conversion.
 */
export function ToBoolean(): PropertyDecorator {
  return (target: object, propertyKey: string | symbol): void => {
    Type(() => String)(target, propertyKey);
    Transform(({ value }) => parseBool(value))(target, propertyKey);
  };
}

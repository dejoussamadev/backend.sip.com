import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
  IsInt,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Role } from '@prisma/client';

/**
 * Payload for creating an agent/admin user.
 *
 * IMPORTANT: do NOT add property initializers (`field = value`) here.
 * `UpdateAgentDto` extends this class via `PartialType`, which copies
 * initializers into every update body — a default here silently overwrites
 * that field on every admin edit (this previously demoted admins to AGENT).
 * Defaults live in the Prisma schema (`@default(...)`) and in
 * `UsersService.create()` instead.
 */
export class CreateAgentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  mobile: string;

  @IsString()
  @IsNotEmpty()
  countryCode: string;

  @IsString()
  @IsNotEmpty()
  designation: string;

  @IsString()
  @IsOptional()
  emp_code?: string;

  @IsString()
  @IsOptional()
  photo?: string;

  /**
   * Coerce string → number so @IsInt() passes when frontend sends "50".
   * Omitted → DB default (`@default(50)`).
   */
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  bookmarkLimit?: number;

  /** Coerce string → number so @IsInt() passes when frontend sends "1" */
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  onlinePropertyLimit?: number | null;

  /** Omitted → AGENT (applied in `UsersService.create()` and the DB default). */
  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  /** Omitted → active (DB default `@default(true)`). */
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

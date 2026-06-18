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

  /** Coerce string → number so @IsInt() passes when frontend sends "50" */
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  bookmarkLimit?: number = 50;

  /** Coerce string → number so @IsInt() passes when frontend sends "1" */
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  onlinePropertyLimit?: number | null;

  @IsEnum(Role)
  @IsOptional()
  role?: Role = Role.AGENT;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}

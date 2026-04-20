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

  @IsInt()
  @IsOptional()
  bookmarkLimit?: number = 50;

  @IsInt()
  @IsOptional()
  onlinePropertyLimit?: number = 0;

  @IsEnum(Role)
  @IsOptional()
  role?: Role = Role.AGENT;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}

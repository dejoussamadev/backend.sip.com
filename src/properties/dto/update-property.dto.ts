import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';
import { CreatePropertyDto } from './create-property.dto';

const toStringArray = (value: unknown): string[] | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  return (Array.isArray(value) ? value : [value])
    .map((item) => String(item).trim())
    .filter(Boolean);
};

const toBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return Boolean(value);
};

export class UpdatePropertyDto extends PartialType(CreatePropertyDto) {
  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsString({ each: true })
  keptUrls?: string[];

  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  removeDocument?: boolean;
}

import {
  IsNotEmpty,
  IsString,
  IsArray,
  IsInt,
  ArrayNotEmpty,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTypeDto {
  /** Display name of the type (e.g. "Apartment"). */
  @IsString()
  @IsNotEmpty()
  name: string;

  /**
   * IDs of the categories this type belongs to.
   * At least one is required — a type with no category never appears in
   * the property form's cascading dropdowns.
   */
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Type(() => Number)
  categoryIds: number[];

  /**
   * IDs of layouts available for this type (optional).
   * Only layouts linked here will be offered when an agent picks this type.
   */
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  layoutIds?: number[];
}

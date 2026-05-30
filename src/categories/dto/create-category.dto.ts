import { CategoryKind } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  IsArray,
  IsInt,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCategoryDto {
  /** Display name of the category (e.g. "Residential Sales"). */
  @IsString()
  @IsNotEmpty()
  name: string;

  /**
   * Drives sale-vs-rent business rules (reservation fees, payment modes).
   * Locked after creation — only the name is editable via UpdateCategoryDto.
   */
  @IsEnum(CategoryKind)
  kind: CategoryKind;

  /**
   * IDs of types to link to this category.
   * At least one is required — a category with no types produces no options
   * in the property form's type dropdown.
   */
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Type(() => Number)
  typeIds: number[];

  /**
   * IDs of furnishings to link to this category.
   * At least one is required — a category with no furnishings produces no options
   * in the property form's furnishing dropdown.
   */
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Type(() => Number)
  furnishingIds: number[];
}

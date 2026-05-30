import {
  IsNotEmpty,
  IsString,
  IsArray,
  IsInt,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFurnishingDto {
  /** Display name of the furnishing option (e.g. "Furnished"). */
  @IsString()
  @IsNotEmpty()
  name: string;

  /**
   * IDs of the categories this furnishing belongs to.
   * At least one is required — a furnishing with no category never appears
   * in the property form's cascading dropdowns.
   */
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Type(() => Number)
  categoryIds: number[];
}

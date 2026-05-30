import {
  IsNotEmpty,
  IsString,
  IsArray,
  IsInt,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLayoutDto {
  /** Display name of the layout (e.g. "Studio", "1 BR"). */
  @IsString()
  @IsNotEmpty()
  name: string;

  /**
   * IDs of the types this layout belongs to.
   * At least one is required — a layout with no type never appears in
   * the property form's cascading dropdowns.
   */
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Type(() => Number)
  typeIds: number[];
}

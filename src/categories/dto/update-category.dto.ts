import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateCategoryDto } from './create-category.dto';

/**
 * `kind` is locked at creation — changing it on a category that already has
 * properties/reservations would silently flip the sale/rent fee rules for
 * past data, so we strip it from the editable surface.
 */
export class UpdateCategoryDto extends PartialType(
  OmitType(CreateCategoryDto, ['kind'] as const),
) {}

import { PartialType } from '@nestjs/mapped-types';
import { CreateFurnishingDto } from './create-furnishing.dto';

export class UpdateFurnishingDto extends PartialType(CreateFurnishingDto) {}

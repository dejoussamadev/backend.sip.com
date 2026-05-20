import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReservationLinkDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  propertyId: number;

  @IsOptional()
  @IsString()
  unitNumber?: string;
}

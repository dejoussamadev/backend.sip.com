import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReservationLinkDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  propertyId: number;
}

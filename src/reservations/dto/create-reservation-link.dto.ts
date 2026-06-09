import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReservationLinkDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  propertyId: number;

  @IsOptional()
  @IsString()
  unitNumber?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  commissionPct?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  downPaymentPct?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  reservationFeePct: number;
}

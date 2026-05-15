import { IsOptional, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ContractPeriod, ReservationStatus } from '@prisma/client';

export class ReservationQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  propertyId?: number;

  @IsOptional()
  @IsEnum(ContractPeriod)
  contractPeriod?: ContractPeriod;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  createdById?: number;

  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}

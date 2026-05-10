import { IsOptional, IsInt, Min, IsEnum, IsString } from 'class-validator';
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
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}

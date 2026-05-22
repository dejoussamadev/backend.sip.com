import {
  IsBoolean,
  IsDateString,
  IsEmail,
  Equals,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsNotEmpty,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  ContractPeriod,
  PaymentMethod,
  PaymentModality,
  ReservationIdType,
} from '@prisma/client';

export class SubmitReservationDto {
  @IsDateString()
  reservationDate: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  nationality: string;

  @IsEnum(ReservationIdType)
  idType: ReservationIdType;

  @IsString()
  @IsNotEmpty()
  idNumber: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  countryCode: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  propertyId: number;

  @IsEnum(ContractPeriod)
  contractPeriod: ContractPeriod;

  @IsEnum(PaymentModality)
  paymentModality: PaymentModality;

  @IsOptional()
  @IsDateString()
  moveInDate?: string;

  @IsDateString()
  contractStartDate: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  sellingPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  downPaymentPct?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  commissionPct?: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  reservationFeeAmount: number;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @Equals(true, { message: 'You must accept the terms and conditions.' })
  @Transform(({ value }) => value === 'true' || value === true)
  termsAccepted: boolean;

  @IsOptional()
  @IsString()
  unitNumber?: string;
}

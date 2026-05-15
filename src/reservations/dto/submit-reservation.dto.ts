import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  Equals,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  BookingFeeModality,
  ContractPeriod,
  PaymentMethod,
  PaymentModality,
  ReservationIdType,
  SecurityDepositStatus,
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

  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  utilitiesIncluded: boolean;

  @IsDateString()
  moveInDate: string;

  @IsDateString()
  contractStartDate: string;

  @IsEnum(BookingFeeModality)
  bookingFeeModality: BookingFeeModality;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  paidBookingFee: number;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsEnum(SecurityDepositStatus)
  securityDeposit: SecurityDepositStatus;

  @Equals(true, { message: 'You must accept the terms and conditions.' })
  @Transform(({ value }) => value === 'true' || value === true)
  termsAccepted: boolean;
}

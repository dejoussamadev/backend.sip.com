import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class CreateLandlordDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsDateString()
  @IsNotEmpty()
  expiryDate: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  countryCode: string;

  @IsString()
  @IsNotEmpty()
  mobile: string;

  @IsString()
  @IsOptional()
  alternativeCountryCode?: string;

  @IsString()
  @IsOptional()
  alternativeMobile?: string;

  @IsString()
  @IsOptional()
  note?: string;

  @IsString()
  @IsNotEmpty()
  mapLink: string;

  // Chemins des fichiers uploadés
  @IsString()
  @IsNotEmpty()
  marketingAgreement: string;

  @IsString()
  @IsNotEmpty()
  draftContract: string;
}
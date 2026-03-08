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
  @IsOptional()
  expiryDate?: string;

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
  @IsOptional()
  mapLink?: string;

  // Chemins des fichiers uploadés
  @IsString()
  @IsOptional()
  marketingAgreement?: string;

  @IsString()
  @IsOptional()
  draftContract?: string;
}

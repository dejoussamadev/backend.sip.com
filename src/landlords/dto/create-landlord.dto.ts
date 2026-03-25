import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class CreateLandlordDto {
  @IsString()
  @IsNotEmpty({ message: 'Le nom est requis' })
  name: string;

  @IsDateString()
  @IsNotEmpty({ message: "La date d'expiration est requise" })
  expiryDate: string;

  @IsEmail()
  @IsNotEmpty({ message: 'L\'email est requis' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Le code pays est requis' })
  countryCode: string;

  @IsString()
  @IsNotEmpty({ message: 'Le mobile est requis' })
  mobile: string;

  @IsString()
  @IsOptional()
  photo?: string;

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
  @IsNotEmpty({ message: 'Le lien map est requis' })
  mapLink: string;

  // Ces champs seront remplis après l'upload
  @IsString()
  @IsOptional()
  marketingAgreement?: string;

  @IsString()
  @IsOptional()
  draftContract?: string;
}

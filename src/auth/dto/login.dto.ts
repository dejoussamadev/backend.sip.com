import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @IsEmail({}, { message: 'Veuillez fournir un email valide' })
  @IsNotEmpty({ message: 'L\'email est requis' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @IsString({ message: 'Le mot de passe doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
  password: string;

  @IsString({ message: 'Fingerprint is required' })
  @IsNotEmpty({ message: 'Fingerprint is required' })
  fingerprint: string;

  @IsOptional()
  @IsString()
  deviceName?: string;

  @IsOptional()
  @IsString()
  browser?: string;

  @IsOptional()
  @IsString()
  operatingSystem?: string;

  @IsOptional()
  @IsString()
  platform?: string;
}

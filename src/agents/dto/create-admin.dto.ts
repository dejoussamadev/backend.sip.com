import {
    IsEmail,
    IsNotEmpty,
    IsString,
    MinLength,
    IsOptional,
} from 'class-validator';

export class CreateAdminDto {
    @IsString()
    @IsNotEmpty({ message: 'Le nom est requis' })
    name: string;

    @IsEmail({}, { message: 'Veuillez fournir un email valide' })
    @IsNotEmpty({ message: "L'email est requis" })
    email: string;

    @IsString()
    @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
    @IsNotEmpty({ message: 'Le mot de passe est requis' })
    password: string;

    @IsString()
    @IsNotEmpty({ message: 'Le numéro de mobile est requis' })
    mobile: string;

    @IsString()
    @IsOptional()
    designation?: string;
}
import { IsString, MinLength, IsNotEmpty, Matches } from 'class-validator';

export class ChangePasswordDto {
    @IsString()
    @IsNotEmpty({ message: 'L\'ancien mot de passe est requis' })
    currentPassword: string;

    @IsString()
    @MinLength(8, { message: 'Le nouveau mot de passe doit contenir au moins 8 caractères' })
    @Matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]+$/,
        {
            message:
                'Le mot de passe doit contenir au moins: 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial (@$!%*?&#)',
        },
    )
    newPassword: string;

    @IsString()
    @IsNotEmpty({ message: 'La confirmation du mot de passe est requise' })
    confirmPassword: string;
}
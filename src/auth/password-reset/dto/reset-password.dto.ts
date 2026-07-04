import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString({ message: 'PASSWORD_RESET_TOKEN_INVALID' })
  @IsNotEmpty({ message: 'PASSWORD_RESET_TOKEN_INVALID' })
  resetToken: string;

  @IsString({ message: 'PASSWORD_RESET_PASSWORD_WEAK' })
  @MinLength(8, { message: 'PASSWORD_RESET_PASSWORD_WEAK' })
  newPassword: string;
}

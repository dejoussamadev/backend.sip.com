import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangeMyPasswordDto {
  @IsString({ message: 'PASSWORD_CHANGE_CURRENT_REQUIRED' })
  @IsNotEmpty({ message: 'PASSWORD_CHANGE_CURRENT_REQUIRED' })
  currentPassword: string;

  @IsString({ message: 'PASSWORD_RESET_PASSWORD_WEAK' })
  @MinLength(8, { message: 'PASSWORD_RESET_PASSWORD_WEAK' })
  newPassword: string;
}

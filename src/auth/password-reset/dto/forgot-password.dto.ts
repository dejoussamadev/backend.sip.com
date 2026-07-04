import { IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'PASSWORD_RESET_EMAIL_INVALID' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;
}

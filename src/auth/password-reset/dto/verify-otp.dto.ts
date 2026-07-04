import { IsEmail, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class VerifyOtpDto {
  @IsEmail({}, { message: 'PASSWORD_RESET_EMAIL_INVALID' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @Matches(/^\d{6}$/, { message: 'PASSWORD_RESET_CODE_FORMAT' })
  code: string;
}

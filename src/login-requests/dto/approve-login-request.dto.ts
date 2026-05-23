import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * Payload for `PATCH /login-requests/:id/approve`. The admin must name the
 * device being trusted so the resulting `TrustedDevice` row carries a
 * human-readable label (e.g. "Sara's MacBook").
 */
export class ApproveLoginRequestDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  deviceName!: string;
}

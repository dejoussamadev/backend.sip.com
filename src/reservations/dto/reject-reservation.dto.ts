import { IsString, MinLength } from 'class-validator';

export class RejectReservationDto {
  @IsString()
  @MinLength(3)
  reason: string;
}

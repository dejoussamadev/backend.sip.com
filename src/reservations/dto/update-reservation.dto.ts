import { OmitType, PartialType } from '@nestjs/mapped-types';
import { SubmitReservationDto } from './submit-reservation.dto';

export class UpdateReservationDto extends PartialType(
  OmitType(SubmitReservationDto, ['termsAccepted'] as const),
) {}

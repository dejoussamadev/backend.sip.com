import { OmitType } from '@nestjs/mapped-types';
import { SubmitReservationDto } from './submit-reservation.dto';

export class SubmitPublicReservationDto extends OmitType(SubmitReservationDto, [
  'propertyId',
  'commissionPct',
  'downPaymentPct',
  'unitNumber',
] as const) {}

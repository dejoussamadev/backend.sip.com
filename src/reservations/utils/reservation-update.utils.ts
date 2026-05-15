/**
 * Fields that an admin may update on an existing reservation.
 * Using an explicit allowlist prevents mass-assignment if new
 * columns are added to the Prisma model in the future.
 */
const UPDATABLE_RESERVATION_FIELDS = [
  'reservationDate',
  'firstName',
  'lastName',
  'nationality',
  'idType',
  'idNumber',
  'email',
  'phone',
  'countryCode',
  'propertyId',
  'contractPeriod',
  'paymentModality',
  'utilitiesIncluded',
  'moveInDate',
  'contractStartDate',
  'bookingFeeModality',
  'paidBookingFee',
  'paymentMethod',
  'securityDeposit',
] as const;

/**
 * Builds a safe Prisma update payload from the incoming DTO by only
 * picking fields from the explicit allowlist.
 *
 * Date strings (`reservationDate`, `moveInDate`, `contractStartDate`) are
 * converted to `Date` objects so callers don't need to remember the conversion.
 */
export function buildReservationUpdateData(
  dto: Record<string, unknown>,
): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  for (const key of UPDATABLE_RESERVATION_FIELDS) {
    if (dto[key] !== undefined) {
      data[key] = dto[key];
    }
  }

  if (dto['reservationDate'])
    data['reservationDate'] = new Date(dto['reservationDate'] as string);
  if (dto['moveInDate'])
    data['moveInDate'] = new Date(dto['moveInDate'] as string);
  if (dto['contractStartDate'])
    data['contractStartDate'] = new Date(dto['contractStartDate'] as string);

  return data;
}

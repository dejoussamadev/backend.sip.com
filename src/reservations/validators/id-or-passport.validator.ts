// TODO(i18n): QID_PATTERN matches the Qatar QID format (11-digit number).
// Make this country-configurable before expanding to other markets.
const QID_PATTERN = /^\d{11}$/;
const PASSPORT_PATTERN = /^[A-Z0-9]{6,12}$/i;

/**
 * Validates an ID or passport number against the format for its type.
 * Uses string literals to match `ReservationIdType` enum values; update
 * this if the enum values change in the Prisma schema.
 *
 * Returns `true` when the value is valid.
 */
export function validateIdNumber(idType: string, idNumber: string): boolean {
  if (idType === 'ID') return QID_PATTERN.test(idNumber);
  if (idType === 'PASSPORT') return PASSPORT_PATTERN.test(idNumber);
  return false;
}

/**
 * Maps a Prisma reservation result fetched with `RESERVATION_DEFAULT_INCLUDE`
 * into the flat response shape expected by the frontend.
 *
 * Flattens nested `property`, `consultant`, `createdBy`, and `approvedBy`
 * objects into scalar fields and converts Prisma `Decimal` values to numbers
 * so JSON serialization is safe and predictable.
 *
 * @param reservation - Raw Prisma result that includes the four DEFAULT_INCLUDE relations.
 * @returns A plain object whose shape matches `ReservationDto` on the frontend.
 */
export function mapReservationToResponse(reservation: any): any {
  const { property, consultant, createdBy, approvedBy, ...rest } = reservation;
  return {
    ...rest,
    paidBookingFee: Number(rest.paidBookingFee),
    propertyName: property.name,
    unitNumber: property.unitNumber ?? '',
    propertyRange: Number(property.range),
    hasUtilities: property.hasUtilities,
    propertyType: property.type?.name ?? '',
    furnishing: property.furnishing?.name ?? '',
    consultantName: consultant.name,
    createdByName: createdBy.name,
    approvedByName: approvedBy?.name ?? null,
  };
}

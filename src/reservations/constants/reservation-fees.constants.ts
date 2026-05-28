import { CategoryKind } from '@prisma/client';

export const RENT_RESERVATION_FEE_PCT = 50;
export const SALE_RESERVATION_FEE_PCT = 2;

export function isRentKind(kind: CategoryKind | null | undefined): boolean {
  return kind === CategoryKind.RENT;
}

export function isSaleKind(kind: CategoryKind | null | undefined): boolean {
  return kind === CategoryKind.SALE;
}

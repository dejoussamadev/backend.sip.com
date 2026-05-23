import { PropertyCategory } from '../../properties/constants/property.enums';

export const RENT_RESERVATION_FEE_PCT = 50;
export const SALE_RESERVATION_FEE_PCT = 2;

const RENT_CATEGORIES = new Set<string>([
  PropertyCategory.RESIDENTIAL_LEASING,
  PropertyCategory.COMMERCIAL_LEASING,
]);

const SALE_CATEGORIES = new Set<string>([
  PropertyCategory.RESIDENTIAL_SALES,
  PropertyCategory.COMMERCIAL_SALES,
]);

export function isRentCategory(name: string | null | undefined): boolean {
  return name != null && RENT_CATEGORIES.has(name);
}

export function isSaleCategory(name: string | null | undefined): boolean {
  return name != null && SALE_CATEGORIES.has(name);
}

import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  IsBoolean,
  IsArray,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  PropertyCategory,
  PropertyType,
  PropertyLayout,
  BalconyOption,
  FurnishingOption,
} from '../constants/property.enums';
import { PropertyAccess, PropertyStatus, PropertyView } from '@prisma/client';
import { MinDateNow } from '../validators/min-date-now.validator';

const toIntArray = (value: unknown): number[] | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const arr = Array.isArray(value) ? value : [value];
  return arr
    .map((v) => (typeof v === 'number' ? v : Number(v)))
    .filter((n) => Number.isFinite(n));
};

export class CreatePropertyDto {
  @IsOptional() @IsString({ message: 'PROPERTY_REF_NO_STRING' }) refNo?: string;
  @IsString({ message: 'PROPERTY_NAME_REQUIRED' }) name: string;
  @IsOptional() @IsBoolean({ message: 'PROPERTY_SHORT_TERM_BOOL' }) shortTerm?: boolean;
  @IsOptional() @IsString({ message: 'PROPERTY_UNIT_NO_STRING' }) unitNo?: string;

  @IsOptional() @IsEnum(PropertyCategory, { message: 'PROPERTY_CATEGORY_INVALID' }) category?: PropertyCategory;
  @IsOptional() @IsEnum(PropertyType, { message: 'PROPERTY_TYPE_INVALID' }) type?: PropertyType;
  @IsOptional() @IsEnum(PropertyLayout, { message: 'PROPERTY_LAYOUT_INVALID' }) layout?: PropertyLayout;

  @IsOptional() @IsInt({ message: 'PROPERTY_BATHROOMS_INT' }) bathrooms?: number;
  @IsOptional() @IsBoolean({ message: 'PROPERTY_MAID_ROOM_BOOL' }) maidRoom?: boolean;

  @IsOptional() @IsEnum(BalconyOption, { message: 'PROPERTY_BALCONY_INVALID' }) balcony?: BalconyOption;
  @IsOptional() @IsEnum(PropertyView, { message: 'PROPERTY_VIEW_INVALID' }) view?: PropertyView;

  @IsOptional() @IsEnum(FurnishingOption, { message: 'PROPERTY_FURNISHING_INVALID' }) furnishing?: FurnishingOption;
  @IsOptional() @IsNumber({}, { message: 'PROPERTY_SIZE_NUMBER' }) sizeSqm?: number;

  @IsNumber({}, { message: 'PROPERTY_PRICE_REQUIRED' }) price: number;
  @IsOptional() @IsString({ message: 'PROPERTY_CURRENCY_STRING' }) currency?: string;

  @IsOptional()
  @IsNumber({}, { message: 'PROPERTY_COMMISSION_RANGE' })
  @Min(0, { message: 'PROPERTY_COMMISSION_RANGE' })
  @Max(100, { message: 'PROPERTY_COMMISSION_RANGE' })
  commissionPct?: number;

  @IsOptional() @IsEnum(PropertyStatus, { message: 'PROPERTY_STATUS_INVALID' }) status?: PropertyStatus;
  @IsOptional() @MinDateNow({ message: 'PROPERTY_EXPIRY_PAST' }) expiryDate?: Date;

  @IsOptional() @IsEnum(PropertyAccess, { message: 'PROPERTY_ACCESS_INVALID' }) access?: PropertyAccess;
  @IsOptional() @IsBoolean({ message: 'PROPERTY_UTILITIES_INCLUDED_BOOL' }) utilitiesIncluded?: boolean;
  @IsOptional() @IsBoolean({ message: 'PROPERTY_FACILITIES_ENABLED_BOOL' }) facilitiesEnabled?: boolean;

  @IsOptional()
  @Transform(({ value }) => toIntArray(value))
  @IsArray({ message: 'PROPERTY_FACILITY_IDS_INVALID' })
  @IsInt({ each: true, message: 'PROPERTY_FACILITY_IDS_INVALID' })
  facilityIds?: number[];

  @IsOptional()
  @Transform(({ value }) => toIntArray(value))
  @IsArray({ message: 'PROPERTY_UTILITY_IDS_INVALID' })
  @IsInt({ each: true, message: 'PROPERTY_UTILITY_IDS_INVALID' })
  utilityIds?: number[];

  @IsOptional() @IsString({ message: 'PROPERTY_DETAILS_STRING' }) propertyDetails?: string;
  @IsOptional() @IsString({ message: 'PROPERTY_NOTES_STRING' }) propertyNotes?: string;

  @IsOptional() @IsString({ message: 'PROPERTY_LOCATION_CODE_STRING' }) locationCode?: string;
  @IsOptional() @IsString({ message: 'PROPERTY_ADDRESS_STRING' }) address?: string;
  @IsOptional() @IsNumber({}, { message: 'PROPERTY_LATITUDE_NUMBER' }) latitude?: number;
  @IsOptional() @IsNumber({}, { message: 'PROPERTY_LONGITUDE_NUMBER' }) longitude?: number;

  @IsOptional() @IsArray({ message: 'PROPERTY_IMAGES_INVALID' }) imageUrls?: string[];
  @IsOptional() @IsArray({ message: 'PROPERTY_DOCUMENTS_INVALID' }) documents?: string[];

  // Relation IDs — sent from the frontend as strings or numbers; the service coerces with Number(...)
  @IsOptional() landlordId?: number | string;
  @IsOptional() agentId?: number | string;
  @IsOptional() categoryId?: number | string;
  @IsOptional() typeId?: number | string;
  @IsOptional() layoutId?: number | string;
  @IsOptional() locationId?: number | string;
  @IsOptional() furnishingId?: number | string;
}

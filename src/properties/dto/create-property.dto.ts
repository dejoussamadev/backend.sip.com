import { IsString, IsOptional, IsNumber, IsInt, IsBoolean, IsArray, IsEnum } from 'class-validator';
import {
  PropertyCategory, PropertyType, PropertyLayout,
  BalconyOption, ViewOption, StatusOption, AccessOption, FurnishingOption,
} from '../constants/property.enums';

export class CreatePropertyDto {
  @IsOptional() @IsString() refNo?: string; // généré si absent
  @IsString() name: string;
  @IsOptional() @IsBoolean() shortTerm?: boolean;
  @IsOptional() @IsString() unitNo?: string;

  @IsEnum(PropertyCategory) category: PropertyCategory;
  @IsEnum(PropertyType) type: PropertyType;
  @IsOptional() @IsEnum(PropertyLayout) layout?: PropertyLayout;

  @IsOptional() @IsInt() bedrooms?: number;
  @IsOptional() @IsInt() bathrooms?: number;
  @IsOptional() @IsBoolean() maidRoom?: boolean;

  @IsOptional() @IsEnum(BalconyOption) balcony?: BalconyOption;
  @IsOptional() @IsEnum(ViewOption) view?: ViewOption;

  @IsOptional() @IsEnum(FurnishingOption) furnishing?: FurnishingOption;
  @IsOptional() @IsNumber() sizeSqm?: number;

  @IsNumber() price: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsNumber() commissionPct?: number;

  @IsEnum(StatusOption) status: StatusOption;
  @IsOptional() expiryDate?: Date | string;

  @IsOptional() @IsEnum(AccessOption) access?: AccessOption;
  @IsOptional() @IsBoolean() utilitiesIncluded?: boolean;
  @IsOptional() @IsBoolean() utilitiesWaterElec?: boolean;
  @IsOptional() @IsBoolean() utilitiesInternet?: boolean;
  @IsOptional() @IsBoolean() utilitiesServiceCharge?: boolean;
  @IsOptional() @IsBoolean() utilitiesSewage?: boolean;
  @IsOptional() @IsBoolean() utilitiesDistrictCooling?: boolean;

  @IsOptional() @IsBoolean() facilitiesEnabled?: boolean;
  @IsOptional() @IsBoolean() facSharedPool?: boolean;
  @IsOptional() @IsBoolean() facClubHouse?: boolean;
  @IsOptional() @IsBoolean() facSauna?: boolean;
  @IsOptional() @IsBoolean() facCinema?: boolean;
  @IsOptional() @IsBoolean() facSquash?: boolean;
  @IsOptional() @IsBoolean() facMultiPurposeHall?: boolean;
  @IsOptional() @IsBoolean() facCateringService?: boolean;
  @IsOptional() @IsBoolean() facPrivatePool?: boolean;
  @IsOptional() @IsBoolean() facKidsPlay?: boolean;
  @IsOptional() @IsBoolean() facSteamRoom?: boolean;
  @IsOptional() @IsBoolean() facPadelCourt?: boolean;
  @IsOptional() @IsBoolean() facBasketBall?: boolean;
  @IsOptional() @IsBoolean() facTennis?: boolean;
  @IsOptional() @IsBoolean() facMosque?: boolean;
  @IsOptional() @IsBoolean() facLaundryService?: boolean;
  @IsOptional() @IsBoolean() facGym?: boolean;
  @IsOptional() @IsBoolean() facJacuzzi?: boolean;
  @IsOptional() @IsBoolean() facBBQ?: boolean;
  @IsOptional() @IsBoolean() facFootball?: boolean;
  @IsOptional() @IsBoolean() facCoWorking?: boolean;
  @IsOptional() @IsBoolean() facCleaningService?: boolean;

  @IsOptional() @IsString() propertyDetails?: string;
  @IsOptional() @IsString() propertyNotes?: string;

  @IsOptional() @IsString() locationCode?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;

  @IsOptional() @IsArray() imageUrls?: string[];
  @IsOptional() @IsArray() documents?: string[];

  @IsOptional() @IsString() landlordId?: string;
  @IsOptional() @IsString() agentId?: string;
}

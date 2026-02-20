export enum PropertyCategory {
  RESIDENTIAL_SALES = 'residential_sales',
  RESIDENTIAL_LEASING = 'residential_leasing',
  COMMERCIAL_SALES = 'commercial_sales',
  COMMERCIAL_LEASING = 'commercial_leasing',
}

export enum PropertyType {
  LAND = 'land',
  LABOR_CAMP = 'labor_camp',
  OFFICE_SPACE = 'office_space',
  RETAIL_SPACE = 'retail_space',
  WAREHOUSE = 'warehouse',
  WHOLE_BUILDING = 'whole_building',
  WHOLE_COMPOUND = 'whole_compound',
  APARTMENT = 'apartment',
  COMPOUND_VILLA = 'compound_villa',
  PENTHOUSE = 'penthouse',
  STAND_ALONE_VILLA = 'stand_alone_villa',
  TOWNHOUSE = 'townhouse',
  VILLA = 'villa',
}

export enum PropertyLayout {
  SQM_SPACE = 'sqm_space',
  STUDIO = 'studio',
  ONE_BR = '1br',
  TWO_BR = '2br',
  THREE_BR = '3br',
  FOUR_BR = '4br',
  FIVE_BR = '5br',
  SIX_BR = '6br',
  SEVEN_BR = '7br',
  EIGHT_BR = '8br',
  NINE_BR = '9br',
  TEN_BR = '10br',
  PLUS_TEN_BR = '+10br',
  MIXED = 'mixed',
}

export enum BalconyOption {
  NONE = 'none',
  BALCONY_AVAILABLE = 'balcony_available',
  TERRACE_AVAILABLE = 'terrace_available',
  BALCONY_AND_TERRACE = 'balcony_and_terrace',
}

export enum ViewOption {
  BEACH = 'beach',
  CITY = 'city',
  COMMUNITY = 'community',
  FACILITIES = 'facilities',
  FULL_SEA = 'full_sea',
  MARINA = 'marina',
  MIXED = 'mixed',
  PARTIAL_MARINA = 'partial_marina',
  PARTIAL_SEA = 'partial_sea',
}

export enum StatusOption {
  AVAILABLE = 'available',
  PENDING = 'pending',
  NOT_AVAILABLE = 'not_available',
  ON_HOLD = 'on_hold',
  UPCOMING = 'upcoming',
  ARCHIVED = 'archived',
  TRASH = 'trash',
  REJECTED = 'rejected',
}

export enum AccessOption {
  CALL_APPOINTEMENT = 'call_appointement',
  DIRECT_APPOINTEMENT = 'direct_appointement',
  EMAIL_APPOINTEMENT = 'email_appointement',
}

export enum FurnishingOption {
  FURNISHED = 'furnished',
  SEMI_FURNISHED = 'semi_furnished',
  UNFURNISHED = 'unfurnished',
}

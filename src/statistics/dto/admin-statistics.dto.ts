import { PropertyStatus } from '@prisma/client';

export class StatusPercentageDto {
  status: PropertyStatus;
  count: number;
  percentage: number;
}

export class TopLandlordDto {
  id: number;
  name: string;
  propertiesCount: number;
}

export class TopAgentDto {
  id: number;
  name: string;
  agentCode: string;
  propertiesCount: number;
}

export class TopTypeDto {
  id: number;
  name: string;
  propertiesCount: number;
}

export class TopLocationDto {
  id: number;
  name: string;
  propertiesCount: number;
}

export class CategoryCountDto {
  categoryId: number;
  categoryName: string;
  count: number;
}

export class AdminStatisticsDto {
  statusPercentages: StatusPercentageDto[];
  topLandlords: TopLandlordDto[];
  topAgents: TopAgentDto[];
  topTypes: TopTypeDto[];
  topLocations: TopLocationDto[];
  pendingCount: number;
  expiringCount: number;
  propertiesByCategory: CategoryCountDto[];
}

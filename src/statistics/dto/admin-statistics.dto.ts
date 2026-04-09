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

export class CategoryCountDto {
  categoryId: number;
  categoryName: string;
  count: number;
}

export class AdminStatisticsDto {
  statusPercentages: StatusPercentageDto[];
  topLandlords: TopLandlordDto[];
  topAgents: TopAgentDto[];
  pendingCount: number;
  expiringCount: number;
  propertiesByCategory: CategoryCountDto[];
}

import { PropertyStatus } from '@prisma/client';

export class PropertySummaryDto {
  id: number;
  name: string;
  referenceNumber: string;
  status: PropertyStatus;
  createdAt: Date;
}

export class OverviewStatisticsDto {
  totalProperties: number;
  myProperties?: number;
  latestProperties: PropertySummaryDto[];
}

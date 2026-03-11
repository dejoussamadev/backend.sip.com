import { IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export enum NotificationFilter {
  ALL = 'ALL',
  PROPERTY = 'PROPERTY',
  AGENT = 'AGENT',
}

export class GetNotificationsDto {
  @IsOptional()
  @IsEnum(NotificationFilter)
  filter?: NotificationFilter = NotificationFilter.ALL;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  unreadOnly?: boolean;

  @IsOptional()
  page?: string;

  @IsOptional()
  limit?: string;
}

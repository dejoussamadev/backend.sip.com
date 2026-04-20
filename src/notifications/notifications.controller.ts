import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { NotificationFilter } from './dto/get-notifications.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.AGENT)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(
    @CurrentUser('id') userId: number,
    @Query('filter') filter?: NotificationFilter,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.findAll(
      userId,
      filter,
      unreadOnly === 'true',
      page,
      limit,
    );
  }

  @Get('properties')
  findPropertyNotifications(
    @CurrentUser('id') userId: number,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.findPropertyNotifications(
      userId,
      unreadOnly === 'true',
      page,
      limit,
    );
  }

  @Get('agents')
  findAgentNotifications(
    @CurrentUser('id') userId: number,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.findAgentNotifications(
      userId,
      unreadOnly === 'true',
      page,
      limit,
    );
  }

  @Get('unread-count')
  countUnread(@CurrentUser('id') userId: number) {
    return this.notificationsService.countUnread(userId);
  }

  @Patch('mark-all-read')
  markAllAsRead(
    @CurrentUser('id') userId: number,
    @Query('filter') filter?: NotificationFilter,
  ) {
    return this.notificationsService.markAllAsRead(userId, filter);
  }

  @Delete('clear-read')
  clearRead(@CurrentUser('id') userId: number) {
    return this.notificationsService.clearRead(userId);
  }

  @Patch(':id/read')
  markAsRead(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notificationsService.markAsRead(userId, id);
  }

  @Delete(':id')
  remove(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notificationsService.remove(userId, id);
  }
}

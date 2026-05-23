import {
  Controller,
  Delete,
  Get,
  MessageEvent,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { NotificationsService } from './notifications.service';
import { NotificationsStreamService } from './notifications-stream.service';
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
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly notificationsStream: NotificationsStreamService,
  ) {}

  // Server-Sent Events stream — replaces the prior WebSocket gateway.
  // Same-origin via Vercel rewrite in prod, so the access_token cookie
  // flows without SameSite=None.
  @Sse('stream')
  stream(
    @CurrentUser('id') userId: number,
    @CurrentUser('role') role: Role,
  ): Observable<MessageEvent> {
    return this.notificationsStream.subscribe(userId, role);
  }

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

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
import { Role } from '@prisma/client';
import { NotificationFilter } from './dto/get-notifications.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.AGENT)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // GET /notifications - toutes les notifications
  @Get()
  findAll(
    @Query('filter') filter?: NotificationFilter,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.findAll(
      filter,
      unreadOnly === 'true',
      page,
      limit,
    );
  }

  // GET /notifications/properties - notifications des properties
  @Get('properties')
  findPropertyNotifications(
    @Query('unreadOnly') unreadOnly?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.findPropertyNotifications(
      unreadOnly === 'true',
      page,
      limit,
    );
  }

  // GET /notifications/agents - notifications des agents
  @Get('agents')
  findAgentNotifications(
    @Query('unreadOnly') unreadOnly?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.findAgentNotifications(
      unreadOnly === 'true',
      page,
      limit,
    );
  }

  // GET /notifications/unread-count - compteur de non lues
  @Get('unread-count')
  countUnread() {
    return this.notificationsService.countUnread();
  }

  // PATCH /notifications/mark-all-read - marquer toutes comme lues
  @Patch('mark-all-read')
  markAllAsRead(@Query('filter') filter?: NotificationFilter) {
    return this.notificationsService.markAllAsRead(filter);
  }

  // DELETE /notifications/clear-read - supprimer les notifications lues
  @Delete('clear-read')
  @Roles(Role.ADMIN)
  clearRead() {
    return this.notificationsService.clearRead();
  }

  // PATCH /notifications/:id/read - marquer une notification comme lue
  @Patch(':id/read')
  markAsRead(@Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.markAsRead(id);
  }

  // DELETE /notifications/:id - supprimer une notification
  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.remove(id);
  }
}

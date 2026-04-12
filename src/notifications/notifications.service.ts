import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType, Role } from '@prisma/client';
import { NotificationFilter } from './dto/get-notifications.dto';
import { EmailService, EmailContext } from './email.service';
import { NotificationsGateway } from './notifications.gateway';
import { normalizePagination } from '../common/utils/pagination.util';
import {
  LOGIN_REQUEST_APPROVED,
  LOGIN_REQUEST_CREATED,
  LOGIN_REQUEST_REJECTED,
} from './notification-types';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly agentNotificationTypes: NotificationType[] = [
    NotificationType.AGENT_CREATED,
    NotificationType.AGENT_UPDATED,
    NotificationType.AGENT_DELETED,
    LOGIN_REQUEST_CREATED,
    LOGIN_REQUEST_APPROVED,
    LOGIN_REQUEST_REJECTED,
  ];

  private readonly propertyNotificationTypes: NotificationType[] = [
    NotificationType.PROPERTY_CREATED,
    NotificationType.PROPERTY_UPDATED,
    NotificationType.PROPERTY_DELETED,
  ];

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private notificationsGateway: NotificationsGateway,
  ) {}

  /**
   * Single entry point for all notifications.
   * Saves to DB, sends WebSocket to targeted users, and sends email.
   */
  async notify(params: {
    type: NotificationType;
    message: string;
    emailContext?: EmailContext;
    recipients?: {
      admins?: boolean;
      userIds?: number[];
    };
  }) {
    const {
      type,
      message,
      emailContext,
      recipients = { admins: true, userIds: [] },
    } = params;
    const sendToAdmins = recipients.admins ?? true;
    const recipientUserIds = recipients.userIds ?? [];

    const notification = await this.prisma.notification.create({
      data: { type, message },
    });
    this.logger.log(`Notification: [${type}] ${message}`);

    const admins = sendToAdmins
      ? await this.prisma.user.findMany({
          where: { role: Role.ADMIN, isActive: true },
          select: { id: true, email: true },
        })
      : [];

    if (sendToAdmins) {
      this.notificationsGateway.sendToAdmins(notification);
    }

    const extraRecipients = recipientUserIds.length
      ? await this.prisma.user.findMany({
          where: {
            id: { in: recipientUserIds },
            isActive: true,
          },
          select: { id: true, email: true, role: true },
        })
      : [];

    for (const user of extraRecipients) {
      if (!sendToAdmins || user.role !== Role.ADMIN) {
        this.notificationsGateway.sendToUser(user.id, notification);
      }
    }

    const emails = new Set<string>();

    for (const admin of admins) {
      if (admin.email) {
        emails.add(admin.email);
      }
    }

    for (const user of extraRecipients) {
      if (user.email) {
        emails.add(user.email);
      }
    }

    if (emailContext && emails.size > 0) {
      await this.emailService.sendNotificationEmail(
        type,
        Array.from(emails),
        emailContext,
      );
    }

    return notification;
  }

  // --- Read operations (used by controller) ---

  async findAll(
    filter?: NotificationFilter,
    unreadOnly?: boolean,
    page = '1',
    limit = '20',
  ) {
    const pagination = normalizePagination(page, limit, 20);
    const take = pagination.limit;
    const skip = pagination.skip;

    const where: any = {};

    if (unreadOnly) {
      where.isRead = false;
    }

    if (filter && filter !== NotificationFilter.ALL) {
      if (filter === NotificationFilter.PROPERTY) {
        where.type = {
          in: this.propertyNotificationTypes,
        };
      } else if (filter === NotificationFilter.AGENT) {
        where.type = {
          in: this.agentNotificationTypes,
        };
      }
    }

    const [data, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { ...where, isRead: false } }),
    ]);

    return {
      data,
      meta: {
        total,
        unreadCount,
        page: pagination.page,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async findPropertyNotifications(
    unreadOnly?: boolean,
    page = '1',
    limit = '20',
  ) {
    return this.findAll(NotificationFilter.PROPERTY, unreadOnly, page, limit);
  }

  async findAgentNotifications(unreadOnly?: boolean, page = '1', limit = '20') {
    return this.findAll(NotificationFilter.AGENT, unreadOnly, page, limit);
  }

  async markAsRead(id: number) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(filter?: NotificationFilter) {
    const where: any = { isRead: false };

    if (filter && filter !== NotificationFilter.ALL) {
      if (filter === NotificationFilter.PROPERTY) {
        where.type = {
          in: this.propertyNotificationTypes,
        };
      } else if (filter === NotificationFilter.AGENT) {
        where.type = {
          in: this.agentNotificationTypes,
        };
      }
    }

    const result = await this.prisma.notification.updateMany({
      where,
      data: { isRead: true },
    });

    return { marked: result.count };
  }

  async countUnread() {
    const [total, properties, agents] = await Promise.all([
      this.prisma.notification.count({ where: { isRead: false } }),
      this.prisma.notification.count({
        where: {
          isRead: false,
          type: {
            in: this.propertyNotificationTypes,
          },
        },
      }),
      this.prisma.notification.count({
        where: {
          isRead: false,
          type: {
            in: this.agentNotificationTypes,
          },
        },
      }),
    ]);

    return { total, properties, agents };
  }

  async remove(id: number) {
    return this.prisma.notification.delete({ where: { id } });
  }

  async clearRead() {
    const result = await this.prisma.notification.deleteMany({
      where: { isRead: true },
    });
    return { deleted: result.count };
  }
}

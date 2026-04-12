import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';
import { NotificationFilter } from './dto/get-notifications.dto';
import { EmailService } from './email.service';
import { Role } from '@prisma/client';
import { normalizePagination } from '../common/utils/pagination.util';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
      private prisma: PrismaService,
      private emailService: EmailService,
      private notificationsGateway: NotificationsGateway,

  ) {}

  // Create a notification (used internally)
  async create(type: NotificationType, message: string) {
    const notification = await this.prisma.notification.create({
      data: { type, message },
    });
    this.logger.log(`Notification created: [${type}] ${message}`);
    this.notificationsGateway.broadcastNotification(notification);

    return notification;
  }

  // Notification: property created
  async notifyPropertyCreated(referenceNumber: string, agentName: string) {
    const now = new Date().toLocaleString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    return this.create(
        NotificationType.PROPERTY_CREATED,
        `A new property with reference id ${referenceNumber} has been added by ${agentName} on ${now}.`,
    );
  }

  // Send email to admins when a property is created by an agent
  async sendPropertyCreatedEmail(payload: {
    referenceNumber: string;
    name: string;
    agentName: string;
    price?: number;
    status?: string;
  }) {
    // Get all admins from the Agent table
    const admins = await this.prisma.user.findMany({
      where: {
        role: Role.ADMIN,
        isActive: true,
      },
      select: {
        email: true,
        name: true,
      },
    });

    const recipients = admins.map((admin) => admin.email).filter(Boolean);

    if (recipients.length === 0) {
      this.logger.warn('No admin users found for email notification');
      return;
    }

    this.logger.log(`Sending property creation email to admins: ${recipients.join(', ')}`);
    await this.emailService.sendPropertyCreatedEmail(recipients, payload);
  }

  async sendLoginRequestEmail(payload: {
    userName: string;
    userEmail: string;
    fingerprint: string;
    deviceName?: string;
    browser?: string;
    operatingSystem?: string;
    platform?: string;
    ipAddress?: string | null;
  }) {
    const admins = await this.prisma.user.findMany({
      where: {
        role: Role.ADMIN,
        isActive: true,
      },
      select: {
        email: true,
      },
    });

    const recipients = admins.map((admin) => admin.email).filter(Boolean);

    if (recipients.length === 0) {
      this.logger.warn('No admin users found for login request email notification');
      return;
    }

    this.logger.log(`Sending login request email to admins: ${recipients.join(', ')}`);
    await this.emailService.sendLoginRequestEmail(recipients, payload);
  }

  // Notification: property updated
  async notifyPropertyUpdated(referenceNumber: string, agentName: string) {
    const now = new Date().toLocaleString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    return this.create(
        NotificationType.PROPERTY_UPDATED,
        `Property with reference id ${referenceNumber} has been updated by ${agentName} on ${now}.`,
    );
  }

  // Notification: agent created
  async notifyAgentCreated(agentName: string, agentCode: string) {
    return this.create(
        NotificationType.AGENT_CREATED,
        `A new agent ${agentName} (${agentCode}) has been added. Check agents menu for more details.`,
    );
  }

  // Notification: agent updated
  async notifyAgentUpdated(agentName: string, agentCode: string) {
    return this.create(
        NotificationType.AGENT_UPDATED,
        `Agent ${agentName} (${agentCode}) has been updated. Check agents menu for more details.`,
    );
  }

  // Get all notifications with filters
  async findAll(filter?: NotificationFilter, unreadOnly?: boolean, page = '1', limit = '20') {
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
          in: [NotificationType.PROPERTY_CREATED, NotificationType.PROPERTY_UPDATED],
        };
      } else if (filter === NotificationFilter.AGENT) {
        where.type = {
          in: [NotificationType.AGENT_CREATED, NotificationType.AGENT_UPDATED],
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

  // Get property notifications only
  async findPropertyNotifications(unreadOnly?: boolean, page = '1', limit = '20') {
    return this.findAll(NotificationFilter.PROPERTY, unreadOnly, page, limit);
  }

  // Get agent notifications only
  async findAgentNotifications(unreadOnly?: boolean, page = '1', limit = '20') {
    return this.findAll(NotificationFilter.AGENT, unreadOnly, page, limit);
  }

  // Mark a notification as read
  async markAsRead(id: number) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  // Mark all notifications as read
  async markAllAsRead(filter?: NotificationFilter) {
    const where: any = { isRead: false };

    if (filter && filter !== NotificationFilter.ALL) {
      if (filter === NotificationFilter.PROPERTY) {
        where.type = {
          in: [NotificationType.PROPERTY_CREATED, NotificationType.PROPERTY_UPDATED],
        };
      } else if (filter === NotificationFilter.AGENT) {
        where.type = {
          in: [NotificationType.AGENT_CREATED, NotificationType.AGENT_UPDATED],
        };
      }
    }

    const result = await this.prisma.notification.updateMany({
      where,
      data: { isRead: true },
    });

    return { marked: result.count };
  }

  // Count unread notifications
  async countUnread() {
    const [total, properties, agents] = await Promise.all([
      this.prisma.notification.count({ where: { isRead: false } }),
      this.prisma.notification.count({
        where: {
          isRead: false,
          type: { in: [NotificationType.PROPERTY_CREATED, NotificationType.PROPERTY_UPDATED] },
        },
      }),
      this.prisma.notification.count({
        where: {
          isRead: false,
          type: { in: [NotificationType.AGENT_CREATED, NotificationType.AGENT_UPDATED] },
        },
      }),
    ]);

    return { total, properties, agents };
  }

  // Delete a notification
  async remove(id: number) {
    return this.prisma.notification.delete({ where: { id } });
  }

  // Delete all read notifications
  async clearRead() {
    const result = await this.prisma.notification.deleteMany({
      where: { isRead: true },
    });
    return { deleted: result.count };
  }
}

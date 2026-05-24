import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType, Role } from '@prisma/client';
import { NotificationFilter } from './dto/get-notifications.dto';
import { EmailService, EmailContext } from './email.service';
import { NotificationsStreamService } from './notifications-stream.service';
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
    private notificationsStream: NotificationsStreamService,
  ) {}

  /**
   * Dispatch a notification (DB row + WebSocket publish + optional email).
   *
   * Channels per recipient:
   *  - `admins` / `userIds` → DB notification + WebSocket publish + email.
   *  - `emailOnlyUserIds`   → email only (no DB row, no WebSocket publish).
   *  - `actorUserId`        → always excluded from every channel.
   */
  async notify(params: {
    type: NotificationType;
    message: string;
    entityId?: number;
    emailContext?: EmailContext;
    actorUserId?: number;
    recipients?: {
      admins?: boolean;
      userIds?: number[];
      emailOnlyUserIds?: number[];
    };
  }) {
    const {
      type,
      message,
      entityId,
      emailContext,
      actorUserId,
      recipients = { admins: true, userIds: [], emailOnlyUserIds: [] },
    } = params;
    const sendToAdmins = recipients.admins ?? true;
    const recipientUserIds = (recipients.userIds ?? []).filter(
      (id) => id !== actorUserId,
    );
    const emailOnlyUserIds = (recipients.emailOnlyUserIds ?? []).filter(
      (id) => id !== actorUserId,
    );

    const adminsRaw = sendToAdmins
      ? await this.prisma.user.findMany({
          where: { role: Role.ADMIN, isActive: true },
          select: { id: true, email: true },
        })
      : [];
    const admins = adminsRaw.filter((a) => a.id !== actorUserId);

    const extraRecipients = recipientUserIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: recipientUserIds }, isActive: true },
          select: { id: true, email: true, role: true },
        })
      : [];

    const emailOnlyRecipients = emailOnlyUserIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: emailOnlyUserIds }, isActive: true },
          select: { id: true, email: true },
        })
      : [];

    const adminIds = new Set(admins.map((a) => a.id));
    const allRecipientIds = [
      ...admins.map((a) => a.id),
      ...extraRecipients.filter((u) => !adminIds.has(u.id)).map((u) => u.id),
    ];

    const notification = await this.prisma.notification.create({
      data: {
        type,
        message,
        entityId,
        recipients: {
          create: allRecipientIds.map((userId) => ({ userId })),
        },
      },
    });
    this.logger.log(`Notification: [${type}] ${message}`);

    if (sendToAdmins && admins.length > 0) {
      // publishToAdmins fan-outs to every admin connection; the actor
      // filter at DB-write time prevents an unwanted row, but the WS
      // event would still reach the actor's own socket. Publish per
      // admin explicitly to honor actor exclusion in real-time too.
      for (const admin of admins) {
        this.notificationsStream.publishToUser(admin.id, notification);
      }
    }

    for (const user of extraRecipients) {
      if (!sendToAdmins || user.role !== Role.ADMIN) {
        this.notificationsStream.publishToUser(user.id, notification);
      }
    }

    const emails = new Set<string>();
    for (const admin of admins) {
      if (admin.email) emails.add(admin.email);
    }
    for (const user of extraRecipients) {
      if (user.email) emails.add(user.email);
    }
    for (const user of emailOnlyRecipients) {
      if (user.email) emails.add(user.email);
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

  async findAll(
    userId: number,
    filter?: NotificationFilter,
    unreadOnly?: boolean,
    page = '1',
    limit = '20',
  ) {
    const pagination = normalizePagination(page, limit, 20);

    const where: any = { userId };
    if (unreadOnly) where.isRead = false;
    if (filter && filter !== NotificationFilter.ALL) {
      where.notification = {
        type: {
          in:
            filter === NotificationFilter.PROPERTY
              ? this.propertyNotificationTypes
              : this.agentNotificationTypes,
        },
      };
    }

    const [rows, total, unreadCount] = await Promise.all([
      this.prisma.notificationRecipient.findMany({
        where,
        include: { notification: true },
        orderBy: { notification: { createdAt: 'desc' } },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      this.prisma.notificationRecipient.count({ where }),
      this.prisma.notificationRecipient.count({
        where: { ...where, isRead: false },
      }),
    ]);

    const data = rows.map(({ notification, isRead, readAt }) => ({
      ...notification,
      isRead,
      readAt,
    }));

    return {
      data,
      meta: {
        total,
        unreadCount,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  async findPropertyNotifications(
    userId: number,
    unreadOnly?: boolean,
    page = '1',
    limit = '20',
  ) {
    return this.findAll(
      userId,
      NotificationFilter.PROPERTY,
      unreadOnly,
      page,
      limit,
    );
  }

  async findAgentNotifications(
    userId: number,
    unreadOnly?: boolean,
    page = '1',
    limit = '20',
  ) {
    return this.findAll(
      userId,
      NotificationFilter.AGENT,
      unreadOnly,
      page,
      limit,
    );
  }

  async markAsRead(userId: number, notificationId: number) {
    const recipient = await this.prisma.notificationRecipient.findUnique({
      where: { userId_notificationId: { userId, notificationId } },
    });
    if (!recipient) throw new NotFoundException('Notification not found');

    return this.prisma.notificationRecipient.update({
      where: { userId_notificationId: { userId, notificationId } },
      data: { isRead: true, readAt: new Date() },
      include: { notification: true },
    });
  }

  async markAllAsRead(userId: number, filter?: NotificationFilter) {
    const where: any = { userId, isRead: false };
    if (filter && filter !== NotificationFilter.ALL) {
      where.notification = {
        type: {
          in:
            filter === NotificationFilter.PROPERTY
              ? this.propertyNotificationTypes
              : this.agentNotificationTypes,
        },
      };
    }

    const result = await this.prisma.notificationRecipient.updateMany({
      where,
      data: { isRead: true, readAt: new Date() },
    });
    return { marked: result.count };
  }

  async countUnread(userId: number) {
    const [total, properties, agents] = await Promise.all([
      this.prisma.notificationRecipient.count({
        where: { userId, isRead: false },
      }),
      this.prisma.notificationRecipient.count({
        where: {
          userId,
          isRead: false,
          notification: { type: { in: this.propertyNotificationTypes } },
        },
      }),
      this.prisma.notificationRecipient.count({
        where: {
          userId,
          isRead: false,
          notification: { type: { in: this.agentNotificationTypes } },
        },
      }),
    ]);
    return { total, properties, agents };
  }

  async remove(userId: number, notificationId: number) {
    const recipient = await this.prisma.notificationRecipient.findUnique({
      where: { userId_notificationId: { userId, notificationId } },
    });
    if (!recipient) throw new NotFoundException('Notification not found');

    return this.prisma.notificationRecipient.delete({
      where: { userId_notificationId: { userId, notificationId } },
    });
  }

  async clearRead(userId: number) {
    const result = await this.prisma.notificationRecipient.deleteMany({
      where: { userId, isRead: true },
    });
    return { deleted: result.count };
  }
}

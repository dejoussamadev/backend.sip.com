import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';
import { NotificationFilter } from './dto/get-notifications.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  // Crée une notification (utilisé en interne)
  async create(type: NotificationType, message: string) {
    const notification = await this.prisma.notification.create({
      data: { type, message },
    });
    this.logger.log(`Notification créée: [${type}] ${message}`);
    return notification;
  }

  // Notification: property créée
  async notifyPropertyCreated(referenceNumber: string, agentName: string) {
    const now = new Date().toLocaleString('en-GB', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });
    return this.create(
      NotificationType.PROPERTY_CREATED,
      `A new property with reference id ${referenceNumber} has been added by ${agentName} on ${now}.`,
    );
  }

  // Notification: property mise à jour
  async notifyPropertyUpdated(referenceNumber: string, agentName: string) {
    const now = new Date().toLocaleString('en-GB', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });
    return this.create(
      NotificationType.PROPERTY_UPDATED,
      `Property with reference id ${referenceNumber} has been updated by ${agentName} on ${now}.`,
    );
  }

  // Notification: agent créé
  async notifyAgentCreated(agentName: string, agentCode: string) {
    return this.create(
      NotificationType.AGENT_CREATED,
      `A new agent ${agentName} (${agentCode}) has been added. Check agents menu for more details.`,
    );
  }

  // Notification: agent mis à jour
  async notifyAgentUpdated(agentName: string, agentCode: string) {
    return this.create(
      NotificationType.AGENT_UPDATED,
      `Agent ${agentName} (${agentCode}) has been updated. Check agents menu for more details.`,
    );
  }

  // Récupérer toutes les notifications avec filtres
  async findAll(filter?: NotificationFilter, unreadOnly?: boolean, page = '1', limit = '20') {
    const take = Number(limit);
    const skip = (Number(page) - 1) * take;

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
        page: Number(page),
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  // Récupérer les notifications de properties uniquement
  async findPropertyNotifications(unreadOnly?: boolean, page = '1', limit = '20') {
    return this.findAll(NotificationFilter.PROPERTY, unreadOnly, page, limit);
  }

  // Récupérer les notifications d'agents uniquement
  async findAgentNotifications(unreadOnly?: boolean, page = '1', limit = '20') {
    return this.findAll(NotificationFilter.AGENT, unreadOnly, page, limit);
  }

  // Marquer une notification comme lue
  async markAsRead(id: number) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  // Marquer toutes les notifications comme lues
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

  // Compter les notifications non lues
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

  // Supprimer une notification
  async remove(id: number) {
    return this.prisma.notification.delete({ where: { id } });
  }

  // Supprimer toutes les notifications lues
  async clearRead() {
    const result = await this.prisma.notification.deleteMany({
      where: { isRead: true },
    });
    return { deleted: result.count };
  }
}

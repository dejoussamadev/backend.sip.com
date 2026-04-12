import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { Notification } from '@prisma/client';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
      : ['http://localhost:4200'],
    credentials: true,
  },
  namespace: 'notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`Connection rejected: no token (${client.id})`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({
        where: { id: Number(payload.sub) },
        select: { id: true, role: true, isActive: true },
      });

      if (!user || !user.isActive) {
        this.logger.warn(
          `Connection rejected: invalid or inactive user (${client.id})`,
        );
        client.disconnect();
        return;
      }

      client.data.userId = user.id;
      client.data.role = user.role;

      // Socket.IO rooms: scales with Redis adapter when running multiple instances
      await client.join(`role:${user.role}`);
      await client.join(`user:${user.id}`);

      this.logger.log(
        `Client connected: ${client.id} (user ${user.id}, ${user.role})`,
      );
    } catch {
      this.logger.warn(`Connection rejected: invalid token (${client.id})`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  private extractToken(client: Socket): string | null {
    // Try socket.io auth option first (client passes { auth: { token } })
    const authToken = client.handshake.auth?.token;
    if (authToken) return authToken;

    // Fall back to httpOnly cookie (matching REST auth flow)
    const cookieHeader = client.handshake.headers.cookie;
    if (cookieHeader) {
      const match = cookieHeader.match(/access_token=([^;]+)/);
      return match ? match[1] : null;
    }

    return null;
  }

  sendToAdmins(notification: Notification) {
    this.server.to('role:ADMIN').emit('notification', notification);
  }

  sendToUser(userId: number, notification: Notification) {
    this.server.to(`user:${userId}`).emit('notification', notification);
  }
}

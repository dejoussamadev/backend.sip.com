import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
    cors: {
        origin: '*',
        credentials: true,
    },
    namespace: 'notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(NotificationsGateway.name);
    private userSockets: Map<number, string[]> = new Map(); // userId -> socketIds

    handleConnection(client: Socket) {
        this.logger.log(`Client connecté: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        for (const [userId, sockets] of this.userSockets.entries()) {
            const index = sockets.indexOf(client.id);
            if (index !== -1) {
                sockets.splice(index, 1);
                if (sockets.length === 0) this.userSockets.delete(userId);
                break;
            }
        }
        this.logger.log(`Client déconnecté: ${client.id}`);
    }

    @SubscribeMessage('register')
    handleRegister(@MessageBody() userId: number, @ConnectedSocket() client: Socket) {
        if (!this.userSockets.has(userId)) {
            this.userSockets.set(userId, []);
        }
        this.userSockets.get(userId)!.push(client.id);
        this.logger.log(`Utilisateur ${userId} enregistré avec socket ${client.id}`);
    }

    broadcastNotification(notification: any) {
        this.server.emit('notification', notification);
    }

    sendToUser(userId: number, notification: any) {
        const socketIds = this.userSockets.get(userId);
        if (socketIds) {
            socketIds.forEach(socketId => {
                this.server.to(socketId).emit('notification', notification);
            });
        }
    }
}
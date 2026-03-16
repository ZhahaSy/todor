import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { NotificationService } from './notification.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'notifications',
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;

  private connectedClients: Map<string, string> = new Map(); // userId -> socketId

  constructor(private readonly notificationService: NotificationService) {}

  afterInit(server: Server) {
    console.log('Notification gateway initialized');
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    // 从映射中移除断开连接的客户端
    for (const [userId, socketId] of this.connectedClients.entries()) {
      if (socketId === client.id) {
        this.connectedClients.delete(userId);
        break;
      }
    }
  }

  @SubscribeMessage('register')
  handleRegister(client: Socket, userId: string) {
    this.connectedClients.set(userId, client.id);
    console.log('register user userId:', userId);
    console.log('register user socketId:', client.id);

    console.log(`User ${userId} registered with socket ${client.id}`);
  }

  @SubscribeMessage('unregister')
  handleUnregister(client: Socket, userId: string) {
    this.connectedClients.delete(userId);
    console.log(`User ${userId} unregistered`);
  }

  // 发送通知给指定用户
  async sendNotificationToUser(userId: string, notification: any) {
    console.log(`Sending notification to user ${userId}:`, notification);
    const socketId = this.connectedClients.get(userId);
    console.log(`Socket ID for user ${userId}:`, socketId);
    if (socketId) {
      this.server.to(socketId).emit('notification', notification);
    }
  }

  // 广播通知给所有用户
  broadcastNotification(notification: any) {
    this.server.emit('notification', notification);
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { User } from '../user/entities/user.entity';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async createNotification(
    user: User,
    title: string,
    content: string,
    type: string,
    todoId?: number,
  ): Promise<Notification> {
    const notification = this.notificationRepository.create({
      user,
      title,
      content,
      type,
      todoId,
    });
    return await this.notificationRepository.save(notification);
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return await this.notificationRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }

  async markAsRead(notificationId: number): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });
    if (notification) {
      notification.read = true;
      return await this.notificationRepository.save(notification);
    }
    throw new Error('Notification not found');
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { user: { id: userId }, read: false },
      { read: true },
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    return await this.notificationRepository.count({
      where: { user: { id: userId }, read: false },
    });
  }
}

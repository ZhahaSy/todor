import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';
import { UserService } from '../user/user.service';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly authUser: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway,
    private readonly userService: UserService,
  ) {
    this.authUser = this.configService.get<string>('MAIL_USER') || '';
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST') || 'smtp.qq.com',
      port: parseInt(this.configService.get<string>('MAIL_PORT') || '465', 10),
      secure: true,
      auth: {
        user: this.authUser,
        pass: this.configService.get<string>('MAIL_PASS') || '',
      },
    });
  }

  async sendMail(to: string, subject: string, text: string): Promise<void> {
    const mailOptions = {
      from: this.authUser,
      to,
      subject,
      text,
    };

    await this.transporter.sendMail(mailOptions);
  }

  /**
   * 发送邮件并同步发送消息通知
   * @param to 收件人邮箱
   * @param subject 邮件主题
   * @param text 邮件内容
   * @param userId 用户ID（可选，用于发送应用内通知）
   */
  async sendMailWithNotification(
    to: string,
    subject: string,
    text: string,
    userId?: string,
  ): Promise<void> {
    // 1. 发送邮件
    await this.sendMail(to, subject, text);

    // 2. 如果有用户ID，发送应用内通知
    if (userId) {
      try {
        const user = await this.userService.findOne({ id: userId });
        if (user) {
          // 创建通知记录
          const notification =
            await this.notificationService.createNotification(
              user,
              `${subject}`,
              text,
              'email',
            );

          // 通过 WebSocket 推送实时通知
          await this.notificationGateway.sendNotificationToUser(userId, {
            id: notification.id,
            title: notification.title,
            content: notification.content,
            type: notification.type,
            read: notification.read,
            createdAt: notification.createdAt,
          });

          console.log(`邮件通知已发送给用户 ${userId}`);
        }
      } catch (error) {
        console.error('发送邮件通知失败:', error);
        // 通知发送失败不影响邮件发送结果
      }
    }
  }
}

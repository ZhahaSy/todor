import { Body, Controller, Post, Get, Param, UseGuards } from '@nestjs/common';
import { EmailService } from './email.service';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '@/common/guard/jwt.auth';
import { Request } from 'express';
import { Req } from '@nestjs/common';
import { ResOp } from '@/common/model/response.model';

@Controller('message')
export class MessageController {
  constructor(
    private readonly emailService: EmailService,
    private readonly notificationService: NotificationService,
  ) {}

  @Post('email')
  async sendEmail(@Body() body: { to: string; subject: string; text: string }) {
    const res = await this.emailService.sendMail(
      body.to,
      body.subject,
      body.text,
    );
    return ResOp.success(res);
  }

  @UseGuards(JwtAuthGuard)
  @Get('notifications')
  async getNotifications(@Req() req: Request) {
    const userId = (req as any).user['id'];
    const res = await this.notificationService.getNotificationsByUser(userId);
    return ResOp.success(res);
  }

  @UseGuards(JwtAuthGuard)
  @Post('notifications/:id/read')
  async markAsRead(@Param('id') id: number) {
    const res = await this.notificationService.markAsRead(id);
    return ResOp.success(res);
  }

  @UseGuards(JwtAuthGuard)
  @Post('notifications/read-all')
  async markAllAsRead(@Req() req: Request) {
    const userId = (req as any).user['id'];
    const res = await this.notificationService.markAllAsRead(userId);
    return ResOp.success(res);
  }

  @UseGuards(JwtAuthGuard)
  @Get('notifications/unread-count')
  async getUnreadCount(@Req() req: Request) {
    const userId = (req as any).user['id'];
    const count = await this.notificationService.getUnreadCount(userId);
    return ResOp.success(count);
  }
}

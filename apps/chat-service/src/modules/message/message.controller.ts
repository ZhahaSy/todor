import { Body, Controller, Post } from '@nestjs/common';
import { EmailService } from './email.service';

@Controller('message')
export class MessageController {
  constructor(private readonly emailService: EmailService) {}

  @Post('email')
  async sendEmail(@Body() body: { to: string; subject: string; text: string }) {
    await this.emailService.sendMail(body.to, body.subject, body.text);
  }
}

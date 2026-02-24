import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly authUser: string;

  constructor(private readonly configService: ConfigService) {
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
}

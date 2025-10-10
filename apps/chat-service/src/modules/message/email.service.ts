import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { mailConfig } from './config';

@Injectable()
export class EmailService {
  private transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: mailConfig.host,
      port: mailConfig.port,
      secure: true, // 如果是 SMTPS 连接，设置为 true
      auth: {
        user: mailConfig.authUser,
        pass: mailConfig.authPass,
      },
    });
  }

  async sendMail(to: string, subject: string, text: string): Promise<void> {
    const mailOptions = {
      from: mailConfig.authUser,
      to,
      subject,
      text,
    };

    await this.transporter.sendMail(mailOptions);
  }
}

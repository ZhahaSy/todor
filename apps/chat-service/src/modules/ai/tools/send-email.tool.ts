import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { StructuredTool } from '@langchain/core/tools';
import { EmailService } from '../../message/email.service';

@Injectable()
// @ts-expect-error: StructuredTool generic depth exceeds TS limit
export class SendEmailTool extends StructuredTool {
  readonly name = 'send_email';
  readonly description = '发送电子邮件给指定收件人。用于通知、提醒或分享信息。';
  readonly category = 'communication' as const;
  private readonly logger = new Logger(SendEmailTool.name);

  readonly schema = z.object({
    to: z.string().email().describe('收件人邮箱地址'),
    subject: z.string().describe('邮件主题'),
    content: z.string().describe('邮件正文内容'),
  });

  constructor(private readonly emailService: EmailService) {
    super();
  }

  protected async _call(input: z.infer<typeof this.schema>): Promise<string> {
    try {
      await this.emailService.sendMail(input.to, input.subject, input.content);
      return `✅ 邮件已成功发送到 ${input.to}，主题：${input.subject}`;
    } catch (error) {
      this.logger.error('发送邮件失败', error);
      return `发送失败：${error.message}`;
    }
  }
}

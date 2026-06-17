import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { TodoService } from '../../todo/todo.service';
import { AdvancedSchedulerService } from '../../schedule/advanced-scheduler.service';
import type { UserToolContext } from './user-tool-context';
import { makeStructuredTool } from './make-structured-tool';

// creator/email 由请求上下文注入（来自 JWT），不交给模型，避免编造收件人
const reminderSchema = z.object({
  title: z.string().describe('待办标题，简洁明了'),
  content: z.string().describe('待办详细描述'),
  type: z
    .enum(['work', 'life', 'study'])
    .describe('待办类型：work 工作、life 生活、study 学习'),
  priority: z
    .enum(['low', 'medium', 'high'])
    .describe('优先级：low 低、medium 中、high 高'),
  todoTime: z.string().describe('提醒时间，格式：YYYY-MM-DD HH:mm'),
  isUrgent: z.boolean().describe('是否紧急'),
  originInput: z.string().optional().describe('用户原始输入'),
});

@Injectable()
export class CreateReminderTool {
  readonly category = 'automation' as const;
  private readonly logger = new Logger(CreateReminderTool.name);

  constructor(
    private readonly todoService: TodoService,
    private readonly schedulerService: AdvancedSchedulerService,
  ) {}

  /** 按请求构造工具实例，creator/email/userId 取自可信的用户上下文 */
  bindUser(ctx: UserToolContext): DynamicStructuredTool {
    const creator = ctx.userInfo.name;
    const email = ctx.userInfo.email;
    const userId = ctx.userInfo.id;
    return makeStructuredTool({
      name: 'create_reminder',
      description:
        '创建一个待办事项并安排邮件提醒。适合用户说"提醒我..."、"帮我记录..."、"设置提醒..."等场景。',
      schema: reminderSchema,
      func: (input) => this.run(input, creator, email, userId),
    });
  }

  private async run(
    input: z.infer<typeof reminderSchema>,
    creator: string,
    email: string,
    userId: string,
  ): Promise<string> {
    let todoId: string;
    try {
      const todo = await this.todoService.create({
        title: input.title,
        content: input.content,
        type: input.type,
        priority: input.priority,
        todoTime: input.todoTime,
        isUrgent: input.isUrgent,
        creator,
        userId,
        originInput: input.originInput ?? input.title,
      });
      todoId = todo.id;
    } catch (error) {
      this.logger.error('创建待办失败', error);
      return `创建失败：${error.message}`;
    }

    // 排程邮件：如实回报状态，不再"假装设好提醒"
    try {
      const result = await this.schedulerService.scheduleOneTimeEmail(
        todoId,
        input.todoTime,
        email,
        `待办提醒：${input.title}`,
        `您有一条待办事项：\n\n${input.content}\n\n时间：${input.todoTime}`,
      );

      if (result?.status === 'skipped') {
        return (
          `✅ 待办已创建：${input.title}\n` +
          `⚠️ 但提醒时间「${input.todoTime}」已过，未安排提醒邮件。`
        );
      }

      return (
        `✅ 待办已创建并设置提醒\n` +
        `📌 标题：${input.title}\n` +
        `⏰ 提醒时间：${input.todoTime}\n` +
        `📧 提醒邮件将发送到：${email}`
      );
    } catch (error) {
      // 待办已建成，仅排程失败（多为时间格式无效）
      this.logger.warn(`待办 ${todoId} 排程失败: ${error.message}`);
      return (
        `✅ 待办已创建：${input.title}\n` +
        `⚠️ 提醒未设置成功：${error.message}`
      );
    }
  }
}

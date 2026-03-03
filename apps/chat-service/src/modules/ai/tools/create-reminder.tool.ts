import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { StructuredTool } from '@langchain/core/tools';
import { TodoService } from '../../todo/todo.service';
import { AdvancedSchedulerService } from '../../schedule/advanced-scheduler.service';

@Injectable()
// @ts-expect-error: StructuredTool generic depth exceeds TS limit
export class CreateReminderTool extends StructuredTool {
  readonly name = 'create_reminder';
  readonly description =
    '创建一个待办事项并安排邮件提醒。适合用户说"提醒我..."、"帮我记录..."、"设置提醒..."等场景。';
  readonly category = 'automation' as const;
  private readonly logger = new Logger(CreateReminderTool.name);

  readonly schema = z.object({
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
    creator: z.string().describe('创建人用户名'),
    email: z.string().email().describe('提醒发送到的邮箱'),
    originInput: z.string().optional().describe('用户原始输入'),
  });

  constructor(
    private readonly todoService: TodoService,
    private readonly schedulerService: AdvancedSchedulerService,
  ) {
    super();
  }

  protected async _call(input: z.infer<typeof this.schema>): Promise<string> {
    try {
      const todo = await this.todoService.create({
        title: input.title,
        content: input.content,
        type: input.type,
        priority: input.priority,
        todoTime: input.todoTime,
        isUrgent: input.isUrgent,
        creator: input.creator,
        originInput: input.originInput ?? input.title,
      });

      await this.schedulerService.scheduleOneTimeEmail(
        todo.id,
        new Date(input.todoTime),
        input.email,
        `待办提醒：${input.title}`,
        `您有一条待办事项：\n\n${input.content}\n\n时间：${input.todoTime}`,
      );

      return (
        `✅ 待办已创建并设置提醒\n` +
        `📌 标题：${input.title}\n` +
        `⏰ 提醒时间：${input.todoTime}\n` +
        `📧 提醒邮件将发送到：${input.email}`
      );
    } catch (error) {
      this.logger.error('创建提醒失败', error);
      return `创建失败：${error.message}`;
    }
  }
}

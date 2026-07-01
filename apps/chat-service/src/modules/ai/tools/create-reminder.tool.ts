import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { TodoService } from '../../todo/todo.service';
import { AdvancedSchedulerService } from '../../schedule/advanced-scheduler.service';
import type { UserToolContext } from './user-tool-context';
import { makeStructuredTool } from './make-structured-tool';

// creator/email 由请求上下文注入（来自 JWT），不交给模型，避免编造收件人
//
// 字段命名注意：模型（尤其 v4-flash）本能会把参数传成 time/date/description/task 等
// "直觉命名"，导致 schema 字段拿到 undefined、建出的待办时间/内容为空（实测 eval 抓到的
// 生产 P1 bug）。对策：① 必填字段在 describe 里明确点名 + 给反例；② 非核心字段降为可选
// 带默认值，模型不传也不会让整条 tool call 摆烂。字段名保持不变以兼容现有 DB schema。
// 导出供 eval 桩复用，确保 eval 测的字段引导与生产完全一致。
export const reminderSchema = z.object({
  title: z
    .string()
    .describe('待办标题，简洁明了。例如「产品评审会」「给妈妈打电话」'),
  todoTime: z
    .string()
    .describe(
      '提醒时间，必须是 YYYY-MM-DD HH:mm 格式的绝对时间（如 2026-06-25 09:00）。' +
        '需把"明天上午9点""今晚8点"等相对说法换算成绝对时间。' +
        '注意字段名是 todoTime，不要用 time/date/deadline。',
    ),
  content: z
    .string()
    .optional()
    .describe(
      '待办详细描述（字段名是 content，不要用 description/message）。' +
        '用户没额外说明时可省略，会自动用标题填充。',
    ),
  type: z
    .enum(['work', 'life', 'study'])
    .optional()
    .describe('待办类型：work 工作、life 生活、study 学习。不确定就省略，默认 life。'),
  priority: z
    .enum(['low', 'medium', 'high'])
    .optional()
    .describe('优先级：low 低、medium 中、high 高。不确定就省略，默认 medium。'),
  isUrgent: z
    .boolean()
    .optional()
    .describe('是否紧急。用户没强调紧急时省略即可，默认 false。'),
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
    // 可选字段兜底：模型省略时给安全默认值，避免建出残缺待办
    const content = input.content?.trim() || input.title;
    const type = input.type ?? 'life';
    const priority = input.priority ?? 'medium';
    const isUrgent = input.isUrgent ?? false;
    try {
      const todo = await this.todoService.create({
        title: input.title,
        content,
        type,
        priority,
        todoTime: input.todoTime,
        isUrgent,
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
        `您有一条待办事项：\n\n${content}\n\n时间：${input.todoTime}`,
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

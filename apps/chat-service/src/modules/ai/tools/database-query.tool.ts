import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { TodoService } from '../../todo/todo.service';
import type { UserToolContext } from './user-tool-context';
import { makeStructuredTool } from './make-structured-tool';

// creator 由请求上下文注入，不暴露给模型
const querySchema = z.object({
  type: z
    .array(z.enum(['work', 'life', 'study', 'all']))
    .optional()
    .describe('待办类型过滤'),
  status: z
    .enum(['active', 'completed'])
    .optional()
    .describe('待办状态，默认 active'),
  keyword: z.string().optional().describe('标题或内容关键词搜索'),
  todoMonth: z.string().optional().describe('按月份筛选，格式 YYYY-MM'),
});

@Injectable()
export class DatabaseQueryTool {
  readonly category = 'data' as const;
  private readonly logger = new Logger(DatabaseQueryTool.name);

  constructor(private readonly todoService: TodoService) {}

  /** 按请求构造工具实例，userId 取自可信的用户上下文 */
  bindUser(ctx: UserToolContext): DynamicStructuredTool {
    const userId = ctx.userInfo.id;
    return makeStructuredTool({
      name: 'database_query',
      description:
        '查询当前用户的待办事项列表。可按类型（work/life/study）、状态（active/completed）、关键词、月份筛选。',
      schema: querySchema,
      func: (input) => this.run(input, userId),
    });
  }

  private async run(
    input: z.infer<typeof querySchema>,
    userId: string,
  ): Promise<string> {
    try {
      const todos = await this.todoService.getTodoList({
        userId,
        type: input.type as ('work' | 'life' | 'study' | 'all')[],
        status: input.status,
        keyword: input.keyword,
        todoMonth: input.todoMonth,
      });

      if (todos.length === 0) {
        return '没有找到符合条件的待办事项';
      }

      const summary = todos
        .map(
          (t) =>
            `[${t.id}] ${t.title}（${t.type}/${t.priority}）` +
            `${t.isUrgent ? ' ⚡紧急' : ''}` +
            ` - ${t.status === 'completed' ? '✅已完成' : '📌进行中'}`,
        )
        .join('\n');

      return `共找到 ${todos.length} 条待办：\n${summary}`;
    } catch (error) {
      this.logger.error('查询待办失败', error);
      return `查询失败：${error.message}`;
    }
  }
}

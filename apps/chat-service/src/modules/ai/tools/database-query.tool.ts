import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { StructuredTool } from '@langchain/core/tools';
import { TodoService } from '../../todo/todo.service';

@Injectable()
// @ts-expect-error: StructuredTool generic depth exceeds TS limit
export class DatabaseQueryTool extends StructuredTool {
  readonly name = 'database_query';
  readonly description =
    '查询用户的待办事项列表。可按类型（work/life/study）、状态（active/completed）、关键词筛选，也可查询今日或紧急待办。';
  readonly category = 'data' as const;
  private readonly logger = new Logger(DatabaseQueryTool.name);

  readonly schema = z.object({
    creator: z.string().describe('用户名，必填'),
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

  constructor(private readonly todoService: TodoService) {
    super();
  }

  protected async _call(input: z.infer<typeof this.schema>): Promise<string> {
    try {
      const todos = await this.todoService.getTodoList({
        creator: input.creator,
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

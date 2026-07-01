import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { MemoryService } from '../../memory/memory.service';
import type { UserToolContext } from './user-tool-context';
import { makeStructuredTool } from './make-structured-tool';

/**
 * 长期记忆工具（第一期：显式 写入 / 召回 / 删除）。
 *
 * userId 从可信用户上下文注入，不交给模型（仿 database-query / create-reminder 范式）。
 * 第一期只在用户**显式**要求时写入/删除（"记一下…""别记…了"），不做自动抽取/评分。
 * 见 docs/long-term-memory-design.md。
 */

const CATEGORIES = [
  'health',
  'preference',
  'relationship',
  'goal',
  'profile_extra',
  'other',
] as const;

const saveSchema = z.object({
  content: z.string().describe('要记住的事实，精炼成一句话，如"对花生过敏"'),
  category: z
    .enum(CATEGORIES)
    .describe('分类：health 健康/preference 偏好/relationship 人际/goal 目标/profile_extra 档案/other 其他'),
  subject: z
    .string()
    .optional()
    .describe('这条记忆关于谁：self 用户本人（默认）、或关系人/宠物名如"父亲""猫:咪"'),
  sensitivity: z
    .enum(['normal', 'sensitive'])
    .optional()
    .describe('是否健康/财务/隐私等敏感信息，默认 normal'),
});

@Injectable()
export class SaveMemoryTool {
  readonly category = 'memory' as const;
  private readonly logger = new Logger(SaveMemoryTool.name);

  constructor(private readonly memoryService: MemoryService) {}

  bindUser(ctx: UserToolContext): DynamicStructuredTool {
    const userId = ctx.userInfo.id;
    return makeStructuredTool({
      name: 'save_memory',
      description:
        '记住一条关于用户的长期事实。仅在用户明确要求记住时调用，如"记一下我对花生过敏""记住我喜欢喝美式"。一次性事件/提醒请用 create_reminder，不要用这个。',
      schema: saveSchema,
      func: (input) => this.run(input, userId),
    });
  }

  private async run(
    input: z.infer<typeof saveSchema>,
    userId: string,
  ): Promise<string> {
    try {
      await this.memoryService.create({
        userId,
        content: input.content,
        category: input.category,
        subject: input.subject ?? 'self',
        sensitivity: input.sensitivity ?? 'normal',
        confidence: 'stated', // 显式写入一定是用户明说
        source: input.content,
      });
      return `✅ 已记住：${input.content}`;
    } catch (error) {
      this.logger.error('保存记忆失败', error);
      return `保存失败：${error.message}`;
    }
  }
}

const recallSchema = z.object({
  category: z
    .enum(CATEGORIES)
    .optional()
    .describe('按分类过滤，不传则查全部'),
  keyword: z.string().optional().describe('内容关键词模糊匹配'),
});

@Injectable()
export class RecallMemoryTool {
  readonly category = 'memory' as const;
  private readonly logger = new Logger(RecallMemoryTool.name);

  constructor(private readonly memoryService: MemoryService) {}

  bindUser(ctx: UserToolContext): DynamicStructuredTool {
    const userId = ctx.userInfo.id;
    return makeStructuredTool({
      name: 'recall_memory',
      description:
        '查询关于用户的长期记忆（过敏、偏好、目标、关系等）。当回答需要用到用户个人事实、或用户问"你记得我…吗"时调用，基于查到的记忆作答，不要编造。',
      schema: recallSchema,
      func: (input) => this.run(input, userId),
    });
  }

  private async run(
    input: z.infer<typeof recallSchema>,
    userId: string,
  ): Promise<string> {
    try {
      const memories = await this.memoryService.recall({
        userId,
        category: input.category,
        keyword: input.keyword,
      });
      if (memories.length === 0) {
        return '没有找到相关的记忆。如果用户提到的是新信息，可提示可以帮其记住。';
      }
      // 召回时连来源、确信度、敏感标记一起给模型（反幻觉）
      const lines = memories.map((m) => {
        const tags: string[] = [m.category];
        if (m.subject !== 'self') tags.push(`关于:${m.subject}`);
        if (m.confidence === 'inferred') tags.push('推测');
        if (m.temporality === 'temporal') tags.push('可能时效');
        return `- ${m.content}（${tags.join('/')}）`;
      });
      return `查到 ${memories.length} 条相关记忆：\n${lines.join('\n')}`;
    } catch (error) {
      this.logger.error('召回记忆失败', error);
      return `召回失败：${error.message}`;
    }
  }
}

const deleteSchema = z.object({
  keyword: z
    .string()
    .describe('要删除的记忆的关键词，如用户说"别记我对花生过敏了"则传"花生过敏"'),
});

@Injectable()
export class DeleteMemoryTool {
  readonly category = 'memory' as const;
  private readonly logger = new Logger(DeleteMemoryTool.name);

  constructor(private readonly memoryService: MemoryService) {}

  bindUser(ctx: UserToolContext): DynamicStructuredTool {
    const userId = ctx.userInfo.id;
    return makeStructuredTool({
      name: 'delete_memory',
      description:
        '删除/遗忘关于用户的某条长期记忆。当用户明确要求"别记…了""忘掉我的…"时调用。',
      schema: deleteSchema,
      func: (input) => this.run(input, userId),
    });
  }

  private async run(
    input: z.infer<typeof deleteSchema>,
    userId: string,
  ): Promise<string> {
    try {
      const count = await this.memoryService.softDeleteByKeyword(
        userId,
        input.keyword,
      );
      if (count === 0) {
        return `没有找到包含「${input.keyword}」的记忆，无需删除。`;
      }
      return `✅ 已忘记 ${count} 条与「${input.keyword}」相关的记忆。`;
    } catch (error) {
      this.logger.error('删除记忆失败', error);
      return `删除失败：${error.message}`;
    }
  }
}

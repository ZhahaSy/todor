import { Injectable } from '@nestjs/common';
import zod from 'zod';
import { BaseIntentHandler } from './base.intent-handler';
import { InputData, ProcessedResult } from '../ai.service';
import { RedisService } from '../../redis/redis.service';
import { AiModelProvider } from '../ai-model.provider';

@Injectable()
export class TodoIntentHandler extends BaseIntentHandler {
  constructor(
    private aiModelProvider: AiModelProvider,
    private redisService: RedisService,
  ) {
    super();
  }

  getIntent(): string {
    return 'todo';
  }

  async process(inputData: InputData): Promise<ProcessedResult> {
    const todoSchema = zod.object({
      title: zod.string().describe('待办标题'),
      content: zod.string().describe('待办描述'),
      type: zod
        .string()
        .describe('生活｜工作｜学习')
        .transform((v) => {
          switch (v) {
            case '生活':
              return 'life';
            case '工作':
              return 'work';
            case '学习':
              return 'study';
            default:
              return 'work';
          }
        }),
      priority: zod
        .string()
        .describe('低｜中｜高')
        .transform((v) => {
          switch (v) {
            case '低':
              return 'low';
            case '中':
              return 'medium';
            case '高':
              return 'high';
            default:
              return 'medium';
          }
        }),
      todoTime: zod
        .string()
        .describe('请输入具体时间，格式为：YYYY-MM-DD HH:mm'),
      isUrgent: zod.boolean().describe('是否紧急'),
    });

    // 使用 AI 模型提供者获取模型实例（temperature=0.2 用于结构化输出）
    const model = this.aiModelProvider.getModel(0.2);

    // Create memory using base class method (默认使用全局记忆，支持跨意图访问)
    const memory = this.createMemory(this.redisService.getClient(), inputData);

    // Load chat history using base class method
    const chatHistory = await this.loadChatHistory(memory);

    // Build prompt with history using base class method
    const systemMessage = `你是一个待办事项提取助手，请从用户输入和对话历史中提取待办信息。

重要说明：
1. 如果用户提到"之前说的"、"刚才的"、"最近聊的"、"刚才讨论的"等指代词，请仔细参考对话历史
2. 待办标题和内容应该基于对话历史中的具体内容，而不是用户的指代词本身
3. 例如：用户说"帮我把最近聊的整理成待办"，你应该提取对话历史中实际讨论的主题作为待办内容
4. 如果对话历史中包含技术讨论、学习内容、工作任务等，这些都应该被准确提取

待办提取规则：
- 标题：简洁明了，概括核心任务（如"学习Redis分布式锁"而非"整理待办"）
- 内容：包含对话历史中的关键信息和要点
- 类型：根据内容判断是生活、工作还是学习
- 优先级：根据内容的重要性和紧急程度判断
- 时间：如果用户指定了时间则使用，否则根据上下文合理推断
- 是否紧急：根据内容判断`;

    const prompt = this.buildPromptWithHistory(systemMessage, chatHistory);

    const chain = prompt.pipe(model.withStructuredOutput(todoSchema));
    const structuredData = await chain.invoke({
      input: inputData.input,
      name: inputData.userInfo.name,
      age: inputData.userInfo.age,
      gender: inputData.userInfo.gender,
      hobby: inputData.userInfo.hobby,
    });

    // 生成用户友好的输出
    const output =
      `✅ 已接收：${structuredData.type}类待办\n` +
      `📌 标题：${structuredData.title}\n` +
      `📋 内容：${structuredData.content}\n` +
      `⏰ 时间：${structuredData.todoTime}\n` +
      `🚨 是否紧急：${structuredData.isUrgent}`;

    // Save the conversation to memory using base class method
    await this.saveToMemory(memory, inputData.input, output);

    return this.formatResponse(output, this.getIntent(), structuredData);
  }
}

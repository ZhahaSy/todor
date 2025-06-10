import { Injectable } from '@nestjs/common';
import { ChatDeepSeek } from '@langchain/deepseek';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ConfigService } from '@nestjs/config';
import zod from 'zod';

@Injectable()
export class AiService {
  private readonly chain: any;

  private readonly schema = zod.object({
    title: zod.string().describe('待办标题'),
    content: zod.string().describe('待办描述'),
    type: zod
      .string()
      .describe('待办类型：life（生活），work（工作），study（学习）'),
    priority: zod
      .string()
      .describe('优先级：low（低），medium（中），high（高）'),
    isUrgent: zod.boolean().describe('是否紧急'),
    todoTime: zod
      .string()
      .describe('待办时间：YYYY-MM-DD HH:mm:ss，如2021-01-01 00:00:00'),
    originInput: zod.string().describe('原始输入'),
    originOutput: zod
      .string()
      .describe(
        `✅ 已收到待办事项，请确认以下信息：\n\n` +
          `📝 类型：{type}\n` +
          `🔖 优先级：{priority}\n` +
          `🚨 紧急程度：{isUrgent ? '紧急' : '普通'}\n` +
          `📌 标题：{title}\n` +
          `⏰ 时间：{todoTime}\n` +
          `📋 描述：{content}`,
      ),
  });

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('DEEPSEEK_API_KEY');
    const AIModel = this.configService.get<string>('AI_MODEL');
    const model = new ChatDeepSeek({
      apiKey,
      model: AIModel,
      temperature: 0,
    });

    const prompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        '你是一个非常有用的idea助手，你擅长分析用户输入的待办工作，并对其进行合理的归类。同时，给用户一些案例以及建议',
      ],
      ['human', '{input}'],
    ]);

    this.chain = prompt.pipe(model.withStructuredOutput(this.schema));
  }

  async sendMessage(input: string): Promise<{
    title: string;
    content: string;
    type: string;
    priority: string;
    isUrgent: boolean;
    todoTime: string;
    originInput: string;
    originOutput: string;
  }> {
    const data = await this.chain.invoke({ input });
    return data;
  }
}

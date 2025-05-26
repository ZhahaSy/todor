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
      .describe('待办类型。分为：life 生活，work 工作，study 学习'),
    priority: zod
      .string()
      .describe('todo 等级。分为：low 低，medium 中，high 高'),
    isUrgent: zod.boolean().describe('是否紧急'),
    originInput: zod.string().describe('原始输入'),
    originOutput: zod
      .string()
      .describe('对待办标题，内容，类型，优先级，是否紧急的整理成语言的输出'),
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

  async sendMessage(input: string): Promise<string> {
    const data = await this.chain.invoke({ input });
    return data.originOutput;
  }
}

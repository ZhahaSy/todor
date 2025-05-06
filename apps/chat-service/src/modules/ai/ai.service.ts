import { Injectable } from '@nestjs/common';
import { ChatDeepSeek } from '@langchain/deepseek';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiService {
  private readonly chain: any;

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

    this.chain = prompt.pipe(model);
  }

  async sendMessage(input: string): Promise<string> {
    const data = await this.chain.invoke({ input });
    return data.content;
  }
}

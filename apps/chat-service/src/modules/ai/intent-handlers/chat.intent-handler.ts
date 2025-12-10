import { Injectable } from '@nestjs/common';
import { ChatDeepSeek } from '@langchain/deepseek';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ConfigService } from '@nestjs/config';
import { BaseIntentHandler } from './base.intent-handler';
import { InputData, ProcessedResult } from '../ai.service';

@Injectable()
export class ChatIntentHandler extends BaseIntentHandler {
  constructor(private configService: ConfigService) {
    super();
  }

  getIntent(): string {
    return 'chat';
  }

  async process(inputData: InputData): Promise<ProcessedResult> {
    const model = new ChatDeepSeek({
      apiKey: this.configService.get('DEEPSEEK_API_KEY'),
      model: this.configService.get('AI_MODEL'),
      temperature: 0.7,
    });

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', '你是一个友好的聊天助手，与用户进行自然、友好的对话。'],
      ['human', '{input}'],
    ]);

    const chain = prompt.pipe(model);
    const response = await chain.invoke({ input: inputData.input });

    const content =
      typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);
    return this.formatResponse(content, this.getIntent());
  }
}

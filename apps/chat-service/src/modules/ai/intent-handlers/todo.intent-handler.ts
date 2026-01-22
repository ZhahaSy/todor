import { Injectable } from '@nestjs/common';
import { ChatDeepSeek } from '@langchain/deepseek';
import { ConfigService } from '@nestjs/config';
import zod from 'zod';
import { BaseIntentHandler } from './base.intent-handler';
import { InputData, ProcessedResult } from '../ai.service';

@Injectable()
export class TodoIntentHandler extends BaseIntentHandler {
  constructor(private configService: ConfigService) {
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

    const model = new ChatDeepSeek({
      apiKey: this.configService.get('DEEPSEEK_API_KEY'),
      model: this.configService.get('AI_MODEL'),
      temperature: 0.2,
    });

    const prompt = this.buildPrompt(
      '你是一个待办事项提取助手，请从用户输入中提取待办信息。',
    );

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

    return this.formatResponse(output, this.getIntent(), structuredData);
  }
}

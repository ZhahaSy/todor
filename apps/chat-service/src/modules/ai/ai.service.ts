import { Injectable } from '@nestjs/common';
import { ChatDeepSeek } from '@langchain/deepseek';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ConfigService } from '@nestjs/config';
import { RunnableSequence } from '@langchain/core/runnables';
import zod from 'zod';
import { User } from '../user/entities/user.entity';

// 基础输入输出接口
export interface InputData {
  input: string;
  userInfo: User;
}

export interface IntentResult {
  intent?: string;
  [key: string]: any; // 允许扩展其他字段
}

export interface ProcessedResult {
  output: string;
  intent: string;
  data?: any;
}

// 意图处理接口
export interface IntentHandler {
  getIntent(): string;
  process(inputData: InputData): Promise<ProcessedResult>;
}

// PromptBuilder类保持不变
class PromptBuilder {
  private prompts: Record<string, any> = {};

  addPrompt(key: string, template: string, partials: object) {
    this.prompts[key] =
      ChatPromptTemplate.fromTemplate(template).partial(partials);
    return this;
  }

  buildSystemMessage(additionalContext?: string) {
    const promptKeys = Object.keys(this.prompts);
    return ChatPromptTemplate.fromMessages([
      [
        'system',
        `AI助手上下文：\n` +
          `${promptKeys.map((k) => `{${k}}`).join('\n')}\n` +
          `${additionalContext || ''}`,
      ],
      ['human', '{input}'],
    ]);
  }
}

@Injectable()
export class AiService {
  private readonly intentHandlers: Map<string, IntentHandler> = new Map();
  private readonly intentRecognitionChain: RunnableSequence<
    InputData,
    IntentResult
  >;
  private readonly intentRecognitionSchema = zod.object({
    intent: zod
      .string()
      .describe('用户意图，返回具体意图类型如：todo, chat, reminder等'),
    // [key: string]: zod.ZodAny, // 允许扩展其他字段
  });

  constructor(private configService: ConfigService) {
    const promptBuilder = new PromptBuilder()
      .addPrompt('date', '当前时间：{date}', {
        date: () => new Date().toLocaleString(),
      })
      .addPrompt(
        'info',
        '用户档案：\n年龄：{age}\n性别：{gender}\n兴趣：{hobby}',
        {},
      );

    const model = new ChatDeepSeek({
      apiKey: this.configService.get('DEEPSEEK_API_KEY'),
      model: this.configService.get('AI_MODEL'),
      temperature: 0.2,
    });

    // 仅负责意图识别的chain
    this.intentRecognitionChain = RunnableSequence.from([
      (inputData: InputData) => ({
        input: inputData.input,
        info: {
          age: inputData.userInfo.age,
          gender: inputData.userInfo.gender,
          hobby: inputData.userInfo.hobby,
        },
        date: new Date().toLocaleString(),
      }),
      promptBuilder.buildSystemMessage(
        '任务：仅识别用户的意图，返回一个字符串表示意图类型。\n' +
          '意图类型包括但不限于：\n' +
          '1. todo: 用户需要创建待办事项\n' +
          '2. chat: 用户只是想聊天\n' +
          '3. reminder: 用户需要设置提醒\n' +
          '\n请仅返回意图类型，不需要其他解释。',
      ),
      model.withStructuredOutput(this.intentRecognitionSchema),
    ]);
  }

  // 注册意图处理器
  registerIntentHandler(handler: IntentHandler): void {
    this.intentHandlers.set(handler.getIntent(), handler);
  }

  // 仅负责识别意图
  async recognizeIntent(inputData: InputData): Promise<string> {
    const result = await this.intentRecognitionChain.invoke(inputData);
    return result.intent;
  }

  // 主处理方法
  async process(inputData: InputData): Promise<ProcessedResult> {
    // 1. 识别意图
    const intent = await this.recognizeIntent(inputData);

    console.log('识别到的意图:', intent);

    // 2. 获取对应的处理器
    const handler = this.intentHandlers.get(intent);

    if (!handler) {
      // 如果没有对应的处理器，使用默认处理器或返回错误
      return {
        output: `抱歉，我暂时无法处理这种类型的请求`,
        intent: 'unknown',
      };
    }

    // 3. 使用处理器处理请求
    return handler.process(inputData);
  }
}

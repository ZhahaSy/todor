import { Injectable } from '@nestjs/common';
import { ChatDeepSeek } from '@langchain/deepseek';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ConfigService } from '@nestjs/config';
import { RunnableSequence } from '@langchain/core/runnables';
import zod from 'zod';
import { User } from '../user/entities/user.entity';

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

  getPromptValues() {
    return { ...this.prompts };
  }
}

interface InputData {
  input: string;
  userInfo: User;
}

interface OutputStructured {
  title: string;
  content: string;
  type: string;
  priority: string;
  todoTime: string;
  isUrgent: boolean;
  originInput: string;
  originOutput: string;
}

interface OutputData {
  originOutput: string;
  structured: OutputStructured;
}

@Injectable()
export class AiService {
  // 定义 chain 属性的类型：接收 input 和 userInfo，返回包含 originOutput 和 structured 的结果
  private readonly chain: RunnableSequence<InputData, OutputData>;
  private readonly schema: zod.Schema<Partial<OutputStructured>> = zod.object({
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
      .describe(
        '请输入具体时间，格式为：YYYY-MM-DD HH:mm' +
          `当前时间：${new Date().toLocaleString()}`,
      ),
    isUrgent: zod.boolean().describe('是否紧急'),
    originInput: zod.string().describe('原始输入'),
    originOutput: zod
      .string()
      .describe(
        `✅ 已接收：{type}类待办\n` +
          `📌 标题：{title}\n` +
          `📋 内容：{content}\n` +
          `⏰ 时间：{todoTime}\n` +
          `🚨 是否紧急：{isUrgent}\n`,
      ),
  });

  constructor(private configService: ConfigService) {
    const promptBuilder = new PromptBuilder()
      .addPrompt('date', '当前时间：{date}', {
        date: () => new Date().toLocaleString(),
      })
      .addPrompt(
        'info',
        '用户档案：\n年龄：{age}\n性别：{gender}\n兴趣：{hobby}',
        {}, // 移除硬编码用户信息
      );

    const model = new ChatDeepSeek({
      apiKey: this.configService.get('DEEPSEEK_API_KEY'),
      model: this.configService.get('AI_MODEL'),
      temperature: 0.2,
    });

    this.chain = RunnableSequence.from([
      // 动态注入用户信息
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
        '处理规则：\n1. 自动识别紧急程度\n2. 生成结构化响应\n3. 提供详细解释\n4. 提供原始输入和输出\n5. 提供具体时间\n6. 提供具体内容\n7. 提供具体标题',
      ),
      model.withStructuredOutput(this.schema),
      {
        originOutput: (output: any) => output.originOutput,
        structured: (output: any) => output,
      },
    ]);
  }

  async process(inputData: InputData) {
    return this.chain.invoke(inputData);
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StructuredTool } from '@langchain/core/tools';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import zod from 'zod';
import { User } from '../user/entities/user.entity';
import { AiModelProvider } from './ai-model.provider';

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
  private readonly logger = new Logger(AiService.name);
  private readonly intentHandlers: Map<string, IntentHandler> = new Map();
  private readonly tools: Map<string, StructuredTool> = new Map();
  private readonly intentRecognitionChain: RunnableSequence<
    InputData,
    IntentResult
  >;
  private readonly intentRecognitionSchema = zod.object({
    intent: zod
      .string()
      .describe(
        '用户意图，返回具体意图类型：todo | chat | reminder | query | email | agent',
      ),
  });

  constructor(private aiModelProvider: AiModelProvider) {
    const promptBuilder = new PromptBuilder()
      .addPrompt('date', '当前时间：{date}', {
        date: () => new Date().toLocaleString(),
      })
      .addPrompt(
        'info',
        '用户档案：\n年龄：{age}\n性别：{gender}\n兴趣：{hobby}',
        {},
      );

    // 使用 AI 模型提供者获取模型实例（temperature=0.2 用于意图识别）
    const model = this.aiModelProvider.getModel(0.2);

    // 仅负责意图识别的chain
    this.intentRecognitionChain = RunnableSequence.from([
      (inputData: InputData) => {
        const mapped = {
          input: inputData.input,
          info: {
            age: inputData.userInfo.age,
            gender: inputData.userInfo.gender,
            hobby: inputData.userInfo.hobby,
          },
          date: new Date().toLocaleString(),
        };
        console.log('[intentChain] 输入数据:', JSON.stringify(mapped));
        return mapped;
      },
      promptBuilder.buildSystemMessage(
        '任务：仅识别用户的意图，返回一个字符串表示意图类型。\n' +
          '意图类型包括但不限于：\n' +
          '1. todo: 用户需要创建待办事项\n' +
          '2. chat: 用户只是想聊天\n' +
          '3. reminder: 用户需要设置提醒\n' +
          '4. query: 用户想查询已有的待办列表\n' +
          '5. email: 用户想发送邮件\n' +
          '6. agent: 用户需要多步骤操作（如：创建待办并发邮件、查询后总结等）\n' +
          '\n请仅返回意图类型，不需要其他解释。',
      ),
      model.withStructuredOutput(this.intentRecognitionSchema),
    ]);
  }

  // 注册意图处理器
  registerIntentHandler(handler: IntentHandler): void {
    this.intentHandlers.set(handler.getIntent(), handler);
  }

  // 注册 LangChain Tool
  registerTool(tool: StructuredTool): void {
    this.tools.set(tool.name, tool);
    this.logger.log(`工具已注册: ${tool.name}`);
  }

  // 仅负责识别意图
  async recognizeIntent(inputData: InputData): Promise<string> {
    this.logger.log('[recognizeIntent] 开始识别, input=' + inputData.input);
    const result = await this.intentRecognitionChain.invoke(inputData);
    this.logger.log('[recognizeIntent] 识别结果: ' + JSON.stringify(result));
    return result.intent;
  }

  // 使用 Agent Executor 处理需要工具调用的请求
  async processWithAgent(inputData: InputData): Promise<ProcessedResult> {
    const model = this.aiModelProvider.getModel(0.7);
    const tools = Array.from(this.tools.values());

    const agentPrompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        `你是 Todor，一个专业的 AI 私人助手。
当前时间：${new Date().toLocaleString()}
用户信息：姓名 ${inputData.userInfo.name}，邮箱 ${inputData.userInfo.email}

你可以使用工具来完成用户的请求。请根据用户需求选择合适的工具，并在必要时组合多个工具完成任务。
如果需要用户邮箱，请使用：${inputData.userInfo.email}
如果需要用户名，请使用：${inputData.userInfo.name}`,
      ],
      ['human', '{input}'],
      ['placeholder', '{agent_scratchpad}'],
    ]);

    const agent = createToolCallingAgent({
      llm: model,
      tools,
      prompt: agentPrompt,
    });

    this.logger.log(`Agent 模型: ${model}`);
    this.logger.log(`Agent 工具: ${tools}`);

    const executor = new AgentExecutor({
      agent,
      tools,
      maxIterations: 5,
    });

    const result = await executor.invoke({ input: inputData.input });

    const intermediateSteps = result.intermediateSteps as Array<{
      action: { tool: string };
    }>;
    const toolsUsed = intermediateSteps?.map((s) => s.action.tool) ?? [];

    return {
      output: result.output,
      intent: 'agent',
      data: { toolsUsed },
    };
  }

  // 主处理方法
  async process(inputData: InputData): Promise<ProcessedResult> {
    // 1. 识别意图
    const intent = await this.recognizeIntent(inputData);
    console.log(intent);

    this.logger.log(`识别到的意图: ${intent}`);

    // 2. 工具类意图直接走 Agent
    const toolIntents = ['query', 'email', 'agent'];
    if (toolIntents.includes(intent) && this.tools.size > 0) {
      this.logger.log(`意图 "${intent}" 转交 Agent 处理`);
      return this.processWithAgent(inputData);
    }

    // 3. 获取对应的处理器
    let handler = this.intentHandlers.get(intent);

    // 特殊处理：当意图是reminder时，使用todo处理器
    // 因为从用户语义上来说，设置提醒和创建待办事项是类似的需求
    if (!handler && intent === 'reminder') {
      handler = this.intentHandlers.get('todo');
      this.logger.log('使用todo处理器处理reminder意图');
    }

    if (!handler) {
      // 没有对应处理器时，尝试用 Agent 兜底
      if (this.tools.size > 0) {
        this.logger.log(`未找到意图 "${intent}" 的处理器，转交 Agent 兜底`);
        return this.processWithAgent(inputData);
      }

      return {
        output: `抱歉，我暂时无法处理这种类型的请求`,
        intent: 'unknown',
      };
    }

    // 4. 使用处理器处理请求
    return handler.process(inputData);
  }
}

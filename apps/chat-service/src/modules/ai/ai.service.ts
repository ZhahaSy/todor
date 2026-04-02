import { Injectable, Logger, forwardRef, Inject, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StructuredTool } from '@langchain/core/tools';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import zod from 'zod';
import * as AsrSdk from 'tencentcloud-sdk-nodejs-asr';
import { User } from '../user/entities/user.entity';
import { RedisService } from '../redis/redis.service';
import { RedisChatMemory } from './memory/redis-chat-memory';
import { AiModelProvider } from './ai-model.provider';
import { SkillService } from '../skill/skill.service';
import { createDynamicSkillTool } from './tools/dynamic-skill.tool';
import { ChatIntentHandler } from './intent-handlers/chat.intent-handler';
import { TodoIntentHandler } from './intent-handlers/todo.intent-handler';
import { DeepDiveIntentHandler } from './intent-handlers/deepdive.intent-handler';
import { DatabaseQueryTool } from './tools/database-query.tool';
import { CreateReminderTool } from './tools/create-reminder.tool';
import { WeatherQueryTool } from './tools/weather-query.tool';
import { TodoService } from '../todo/todo.service';
import { AdvancedSchedulerService } from '../schedule/advanced-scheduler.service';
import { ChatHistoryService } from '../chat-history/chat-history.service';

// 基础输入输出接口
export interface InputData {
  input: string;
  userInfo: User;
  userId?: string; // 用于加载用户 skill
  location?: { lat: number; lon: number };
  forceIntent?: string; // 前端强制指定意图，跳过 LLM 识别
  context?: string; // 深入模式：主对话历史序列化字符串
  deepDiveSessionId?: string; // 深入模式会话ID，用于隔离 Redis 记忆和 DB 存储
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

/** SSE 流：意图 → 若干 token → 最终完成（含完整文本） */
export type AiStreamEvent =
  | { type: 'intent'; intent: string }
  | { type: 'token'; text: string }
  | { type: 'done'; output: string; intent: string; data?: any };

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

type RouteOutcome =
  | { kind: 'agent' }
  | { kind: 'handler'; handler: IntentHandler }
  | { kind: 'fallback'; result: ProcessedResult };

@Injectable()
export class AiService implements OnModuleInit {
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

  constructor(
    private aiModelProvider: AiModelProvider,
    private configService: ConfigService,
    private redisService: RedisService,
    @Inject(forwardRef(() => SkillService))
    private skillService: SkillService,
    private chatIntentHandler: ChatIntentHandler,
    private todoIntentHandler: TodoIntentHandler,
    private deepDiveIntentHandler: DeepDiveIntentHandler,
    private databaseQueryTool: DatabaseQueryTool,
    private createReminderTool: CreateReminderTool,
    private weatherQueryTool: WeatherQueryTool,
    private todoService: TodoService,
    private scheduleService: AdvancedSchedulerService,
    private chatHistoryService: ChatHistoryService,
  ) {
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
        this.logger.log('[intentChain] 输入数据: ' + JSON.stringify(mapped));
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

  onModuleInit() {
    this.registerIntentHandler(this.chatIntentHandler);
    this.registerIntentHandler(this.todoIntentHandler);
    this.registerIntentHandler(this.deepDiveIntentHandler);
    this.registerTool(this.databaseQueryTool as unknown as StructuredTool);
    this.registerTool(this.createReminderTool as unknown as StructuredTool);
    this.registerTool(this.weatherQueryTool as unknown as StructuredTool);
  }

  /** 与 BaseIntentHandler.createGlobalMemory 一致，保证 Agent 与普通聊天共用 Redis 上下文 */
  private createGlobalRedisMemory(inputData: InputData): RedisChatMemory {
    return new RedisChatMemory({
      redis: this.redisService.getClient(),
      sessionId: `user:${inputData.userInfo.id}:global`,
      k: 10,
      ttl: 3600 * 24 * 7,
      messageExpiry: 3600 * 2,
      memoryKey: 'history',
      returnMessages: false,
    });
  }

  private formatModelError(error: unknown): string {
    const err = error as any;
    const message = err?.message || 'Unknown AI request error';
    const causeMessage =
      err?.cause?.message ||
      err?.cause?.code ||
      err?.error?.message ||
      err?.response?.data?.error?.message;

    return causeMessage ? `${message}; cause=${causeMessage}` : message;
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
    try {
      const result = await this.intentRecognitionChain.invoke(inputData);
      this.logger.log('[recognizeIntent] 识别结果: ' + JSON.stringify(result));
      return result.intent;
    } catch (error) {
      this.logger.error(
        `[recognizeIntent] 模型调用失败: ${this.formatModelError(error)}`,
        (error as any)?.stack,
      );
      throw error;
    }
  }

  // 使用 Agent Executor 处理需要工具调用的请求
  async processWithAgent(inputData: InputData): Promise<ProcessedResult> {
    const model = this.aiModelProvider.getModel(0.7);
    const staticTools = Array.from(this.tools.values());

    // 动态加载当前用户的 enabled skills
    const userId = inputData.userId ?? inputData.userInfo?.id;
    let dynamicTools: StructuredTool[] = [];
    if (userId) {
      try {
        const skills = await this.skillService.findEnabled(userId);
        dynamicTools = skills.map(createDynamicSkillTool);
        if (dynamicTools.length > 0) {
          this.logger.log(
            `加载用户 ${userId} 的 ${dynamicTools.length} 个 skill`,
          );
        }
      } catch (err) {
        this.logger.warn(
          `加载用户 skill 失败: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    const tools = [...staticTools, ...dynamicTools];

    const locationInfo = inputData.location
      ? `用户当前位置：纬度 ${inputData.location.lat}，经度 ${inputData.location.lon}`
      : '用户位置：未提供';

    const memory = this.createGlobalRedisMemory(inputData);
    const memoryVariables = await memory.loadMemoryVariables({});
    const chatHistoryRaw =
      (memoryVariables.history as string) || '暂无历史对话';
    const escapedHistory = String(chatHistoryRaw)
      .replace(/\{/g, '{{')
      .replace(/\}/g, '}}');

    const agentPrompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        `你是 Todor，用户的 AI 私人助手。
当前时间：${new Date().toLocaleString()}
用户：${inputData.userInfo.name}，邮箱 ${inputData.userInfo.email}
${locationInfo}

对话历史：
${escapedHistory}

工具只在用户明确需要时才调用，普通对话直接回答。

回复风格要求：
- 直接给出答案，不展示推理过程或分析步骤
- 用自然口语，像朋友聊天，不要像在写报告
- 不用"首先…其次…最后…"这类结构拆解问题
- 简洁，能一句话说清楚就不说两句`,
      ],
      ['human', '{input}'],
      ['placeholder', '{agent_scratchpad}'],
    ]);

    const agent = createToolCallingAgent({
      llm: model,
      tools: tools as any,
      prompt: agentPrompt,
    });

    this.logger.log(`Agent 模型: ${model}`);
    this.logger.log(`Agent 工具: ${tools}`);

    const executor = new AgentExecutor({
      agent,
      tools: tools as any,
      maxIterations: 5,
    });

    let result: any;
    try {
      result = await executor.invoke({ input: inputData.input });
    } catch (error) {
      this.logger.error(
        `[processWithAgent] Agent 调用失败: ${this.formatModelError(error)}`,
        (error as any)?.stack,
      );
      throw error;
    }

    await memory.saveContext(
      { input: inputData.input },
      { output: result.output },
    );

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

  private async resolveRoute(
    intent: string,
    inputData: InputData,
  ): Promise<RouteOutcome> {
    const toolIntents = ['query', 'email', 'agent'];
    if (toolIntents.includes(intent) && this.tools.size > 0) {
      this.logger.log(`意图 "${intent}" 转交 Agent 处理`);
      return { kind: 'agent' };
    }

    const intentsThatSkipSkillAgent = ['todo', 'reminder', 'deepdive'];
    const userId = inputData.userId ?? inputData.userInfo?.id;
    if (userId && !toolIntents.includes(intent) && !intentsThatSkipSkillAgent.includes(intent)) {
      try {
        const userSkills = await this.skillService.findEnabled(userId);
        if (userSkills.length > 0 && this.tools.size > 0) {
          this.logger.log(`用户有 ${userSkills.length} 个 skill，转交 Agent 处理`);
          return { kind: 'agent' };
        }
      } catch {
        // 忽略，继续正常流程
      }
    }

    let handler = this.intentHandlers.get(intent);
    if (!handler && intent === 'reminder') {
      handler = this.intentHandlers.get('todo');
      this.logger.log('使用todo处理器处理reminder意图');
    }

    if (!handler) {
      if (this.tools.size > 0) {
        this.logger.log(`未找到意图 "${intent}" 的处理器，转交 Agent 兜底`);
        return { kind: 'agent' };
      }
      return {
        kind: 'fallback',
        result: { output: '抱歉，我暂时无法处理这种类型的请求', intent: 'unknown' },
      };
    }

    return { kind: 'handler', handler };
  }

  async handlePostProcess(
    result: ProcessedResult,
    input: string,
    userId: string,
    userEmail: string,
    userName: string,
    deepDiveSessionId?: string,
  ): Promise<{ messageId?: string }> {
    if (
      (result.intent === 'todo' || result.intent === 'reminder') &&
      result.data
    ) {
      const todoData = result.data;
      const todo = await this.todoService.create({
        title: todoData.title,
        content: todoData.content,
        type: todoData.type || 'work',
        priority: todoData.priority || 'medium',
        todoTime: todoData.todoTime,
        isUrgent: todoData.isUrgent || false,
        creator: userName,
        originInput: input,
        originOutput: result.output,
      });

      await this.scheduleService.scheduleOneTimeEmail(
        todo.id,
        todoData.todoTime,
        userEmail,
        '待办事项提醒: ' + todoData.title,
        `您有一条待办事项：${todoData.content}`,
        userId,
      );

      return { messageId: todo.id };
    }

    if (result.intent === 'deepdive' && deepDiveSessionId) {
      const now = new Date().toISOString();
      const sessionId = `deepdive:${deepDiveSessionId}`;
      await Promise.all([
        this.chatHistoryService.create({
          content: input,
          role: 'local',
          date: now,
          sessionId,
          userId,
        }),
        this.chatHistoryService.create({
          content: result.output,
          role: 'ai',
          date: now,
          sessionId,
          userId,
        }),
      ]);
    }

    return {};
  }

  // 主处理方法
  async process(inputData: InputData): Promise<ProcessedResult> {
    const intent =
      inputData.forceIntent ?? (await this.recognizeIntent(inputData));
    this.logger.log(`识别到的意图: ${intent}`);

    const route = await this.resolveRoute(intent, inputData);
    if (route.kind === 'agent') return this.processWithAgent(inputData);
    if (route.kind === 'fallback') return route.result;
    return route.handler.process(inputData);
  }

  /**
   * 流式处理：chat / deepdive 走模型 token 流；其余意图与 process 一致，仅结束时推送一条 done。
   */
  async *streamProcess(inputData: InputData): AsyncGenerator<AiStreamEvent> {
    const intent =
      inputData.forceIntent ?? (await this.recognizeIntent(inputData));
    yield { type: 'intent', intent };

    const route = await this.resolveRoute(intent, inputData);

    if (route.kind === 'agent') {
      const result = await this.processWithAgent(inputData);
      yield { type: 'done', output: result.output, intent: result.intent, data: result.data };
      return;
    }

    if (route.kind === 'fallback') {
      yield { type: 'done', output: route.result.output, intent: route.result.intent };
      return;
    }

    const { handler } = route;

    type StreamHandler = {
      streamChat?: (i: InputData) => AsyncGenerator<string, string>;
      streamDeepDive?: (i: InputData) => AsyncGenerator<string, string>;
    };

    if (intent === 'chat') {
      const h = handler as StreamHandler;
      if (!h.streamChat) {
        const result = await handler.process(inputData);
        yield { type: 'done', output: result.output, intent: result.intent, data: result.data };
        return;
      }
      const gen = h.streamChat(inputData);
      let step = await gen.next();
      while (!step.done) {
        yield { type: 'token', text: step.value as string };
        step = await gen.next();
      }
      yield { type: 'done', output: step.value as string, intent: 'chat' };
      return;
    }

    if (intent === 'deepdive') {
      const h = handler as StreamHandler;
      if (!h.streamDeepDive) {
        const result = await handler.process(inputData);
        yield { type: 'done', output: result.output, intent: result.intent, data: result.data };
        return;
      }
      const gen = h.streamDeepDive(inputData);
      let step = await gen.next();
      while (!step.done) {
        yield { type: 'token', text: step.value as string };
        step = await gen.next();
      }
      yield { type: 'done', output: step.value as string, intent: 'deepdive' };
      return;
    }

    const result = await handler.process(inputData);
    yield { type: 'done', output: result.output, intent: result.intent, data: result.data };
  }

  async recognizeAudio(
    audioData: string,
    format: string,
    dataLen: number,
    engSerViceType = '16k_zh',
  ): Promise<string> {
    const AsrClient = AsrSdk.asr.v20190614.Client;
    const client = new AsrClient({
      credential: {
        secretId: this.configService.get<string>('TENCENT_SECRET_ID'),
        secretKey: this.configService.get<string>('TENCENT_SECRET_KEY'),
      },
      region: 'ap-beijing',
      profile: {
        httpProfile: { endpoint: 'asr.tencentcloudapi.com' },
      },
    });

    const result = await client.SentenceRecognition({
      EngSerViceType: engSerViceType,
      SourceType: 1,
      VoiceFormat: format,
      Data: audioData,
      DataLen: dataLen,
    });

    return result.Result ?? '';
  }
}

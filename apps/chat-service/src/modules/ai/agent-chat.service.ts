import { Injectable, Logger } from '@nestjs/common';
import {
  AIMessage,
  AIMessageChunk,
  BaseMessage,
  SystemMessage,
  HumanMessage,
  ToolMessage,
} from '@langchain/core/messages';
import type { StructuredToolInterface } from '@langchain/core/tools';
import { AiModelProvider } from './ai-model.provider';
import { RedisService } from '../redis/redis.service';
import { RedisChatMemory } from './memory/redis-chat-memory';
import { SkillService } from '../skill/skill.service';
import { createDynamicSkillTool } from './tools/dynamic-skill.tool';
import { createGetUserInfoTool } from './tools/get-user-info.tool';
import { WeatherQueryTool } from './tools/weather-query.tool';
import { DatabaseQueryTool } from './tools/database-query.tool';
import { CreateReminderTool } from './tools/create-reminder.tool';
import {
  SaveMemoryTool,
  RecallMemoryTool,
  DeleteMemoryTool,
} from './tools/memory.tools';
import { extractTokenText } from './utils/langchain-stream';
import type { InputData } from './ai.service';
import type {
  AgentStreamEvent,
  RunTrace,
  ToolCallRecord,
} from './agent-events';

/**
 * 统一的流式 tool-calling agent。
 *
 * 由原 ChatIntentHandler.streamChat 泛化而来：单次 LLM 调用里，模型自行决定调哪个工具
 * （或纯聊天直接回答），无需先用一次 LLM 识别意图、再路由。复合意图（如"建待办并查天气"）
 * 通过循环内连续调用多个工具天然支持。
 *
 * 与 AgentExecutor 不同，这里手写循环以保留 **token 级流式输出** —— todo/query 等场景
 * 过去只在结束时返回一个 done，现在也能逐字输出。
 */
@Injectable()
export class AgentChatService {
  private readonly logger = new Logger(AgentChatService.name);
  private static readonly MAX_ITERATIONS = 5;

  constructor(
    private readonly aiModelProvider: AiModelProvider,
    private readonly redisService: RedisService,
    private readonly skillService: SkillService,
    private readonly weatherTool: WeatherQueryTool,
    private readonly databaseQueryTool: DatabaseQueryTool,
    private readonly createReminderTool: CreateReminderTool,
    private readonly saveMemoryTool: SaveMemoryTool,
    private readonly recallMemoryTool: RecallMemoryTool,
    private readonly deleteMemoryTool: DeleteMemoryTool,
  ) {}

  /** 与各 handler 一致的全局记忆，保证跨场景共享上下文 */
  private createGlobalMemory(inputData: InputData): RedisChatMemory {
    return new RedisChatMemory({
      redis: this.redisService.getClient(),
      sessionId: `user:${inputData.userInfo.id}:global`,
      k: 10,
      ttl: 3600 * 24 * 7,
      messageExpiry: 3600 * 2,
      memoryKey: 'history',
      returnMessages: true,
    });
  }

  /** 按请求构造工具集：用户作用域静态工具 + get_user_info + 该用户启用的 dynamic skills */
  private async buildTools(
    inputData: InputData,
  ): Promise<StructuredToolInterface[]> {
    const ctx = {
      userInfo: inputData.userInfo,
      location: inputData.location,
    };

    const tools: StructuredToolInterface[] = [
      this.weatherTool.bindUser(ctx),
      this.databaseQueryTool.bindUser(ctx),
      this.createReminderTool.bindUser(ctx),
      this.saveMemoryTool.bindUser(ctx),
      this.recallMemoryTool.bindUser(ctx),
      this.deleteMemoryTool.bindUser(ctx),
      createGetUserInfoTool(inputData.userInfo),
    ];

    const userId = inputData.userId ?? inputData.userInfo?.id;
    if (userId) {
      try {
        const skills = await this.skillService.findEnabled(userId);
        for (const skill of skills) {
          tools.push(createDynamicSkillTool(skill) as StructuredToolInterface);
        }
        if (skills.length > 0) {
          this.logger.log(`加载用户 ${userId} 的 ${skills.length} 个 skill`);
        }
      } catch (err) {
        this.logger.warn(
          `加载用户 skill 失败: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return tools;
  }

  private buildSystemMessage(inputData: InputData): SystemMessage {
    const locationInfo = inputData.location
      ? `用户当前位置：纬度 ${inputData.location.lat}，经度 ${inputData.location.lon}`
      : '用户位置：未提供';

    return new SystemMessage(
      `你是 Todor，用户的 AI 私人助手。
当前时间：${new Date().toLocaleString()}
用户：${inputData.userInfo.name}，邮箱 ${inputData.userInfo.email}
${locationInfo}

工具只在用户明确需要时才调用，普通对话直接回答。
需要用户个人信息时调用 get_user_info 工具，不要主动提及用户档案。

回复风格要求：
- 直接给出答案，不展示推理过程或分析步骤
- 用自然口语，像朋友聊天，不要像在写报告
- 不用"首先…其次…最后…"这类结构拆解问题
- 简洁，能一句话说清楚就不说两句`,
    );
  }

  /**
   * 流式处理一条消息。
   *
   * yield 出结构化事件（token 文本增量 / 工具调用 / 工具结果），return 一份完整 RunTrace。
   * 循环：流式调用模型 → 若产生 tool_calls 则 emit 事件、执行工具、把结果喂回继续下一轮 →
   * 否则视为最终回复，存记忆并结束。最后一轮强制去掉工具，逼模型给出文本答案。
   *
   * 工具调用信息由本循环直接 emit（而非 LangChain callbacks）—— 因为这里是手写循环、
   * 工具不在 runnable 链路内，回调抓不到。详见 agent-events.ts。
   */
  async *stream(
    inputData: InputData,
  ): AsyncGenerator<AgentStreamEvent, RunTrace> {
    const startedAt = Date.now();
    const model = this.aiModelProvider.getModel(0.7);
    const tools = await this.buildTools(inputData);
    const toolMap = new Map(tools.map((t) => [t.name, t]));
    const modelWithTools = model.bindTools(tools);

    const memory = this.createGlobalMemory(inputData);
    const history = (await memory.loadMemoryVariables({})).history as
      | BaseMessage[]
      | undefined;

    const messages: BaseMessage[] = [
      this.buildSystemMessage(inputData),
      ...(history ?? []),
      new HumanMessage(inputData.input),
    ];

    let full = '';
    const toolCallRecords: ToolCallRecord[] = [];
    let iterations = 0;

    const buildTrace = (): RunTrace => ({
      finalText: full,
      toolCalls: toolCallRecords,
      iterations,
      totalMs: Date.now() - startedAt,
    });

    for (let iter = 0; iter < AgentChatService.MAX_ITERATIONS; iter++) {
      iterations = iter + 1;
      const isLastIteration = iter === AgentChatService.MAX_ITERATIONS - 1;
      // 末轮去掉工具，强制模型输出文本（避免循环结束时还停在 tool_call 上没有回复）
      const runner = isLastIteration ? model : modelWithTools;

      let textThisRound = '';
      let accumulated: AIMessageChunk | null = null;

      const stream = await runner.stream(messages);
      for await (const chunk of stream) {
        const piece = extractTokenText(chunk);
        if (piece) {
          textThisRound += piece;
          full += piece;
          yield { type: 'token', text: piece };
        }
        accumulated = accumulated
          ? accumulated.concat(chunk as AIMessageChunk)
          : (chunk as AIMessageChunk);
      }

      const toolCalls = accumulated?.tool_calls ?? [];

      if (toolCalls.length === 0 || isLastIteration) {
        await memory.saveContext({ input: inputData.input }, { output: full });
        return buildTrace();
      }

      // 有工具调用：把本轮 AI 消息 + 各工具结果追加进上下文，进入下一轮
      messages.push(
        new AIMessage({ content: textThisRound, tool_calls: toolCalls }),
      );

      for (const call of toolCalls) {
        const callId = call.id ?? `${call.name}_${toolCallRecords.length}`;
        yield {
          type: 'tool_call',
          id: callId,
          name: call.name,
          args: call.args ?? {},
        };

        const tool = toolMap.get(call.name);
        let result: string;
        let ok = true;
        const toolStartedAt = Date.now();
        if (!tool) {
          ok = false;
          result = `工具 ${call.name} 不存在`;
          this.logger.warn(result);
        } else {
          try {
            result = (await tool.invoke(call.args ?? {})) as string;
          } catch (err) {
            ok = false;
            result = `工具 ${call.name} 执行失败：${
              err instanceof Error ? err.message : String(err)
            }`;
            this.logger.error(result);
          }
        }
        const ms = Date.now() - toolStartedAt;

        toolCallRecords.push({
          name: call.name,
          args: call.args ?? {},
          result,
          ok,
          ms,
        });
        yield {
          type: 'tool_result',
          id: callId,
          name: call.name,
          result,
          ok,
          ms,
        };

        messages.push(
          new ToolMessage({ content: result, tool_call_id: call.id! }),
        );
      }
    }

    // 理论上不可达（末轮已 return），兜底保存
    await memory.saveContext({ input: inputData.input }, { output: full });
    return buildTrace();
  }
}

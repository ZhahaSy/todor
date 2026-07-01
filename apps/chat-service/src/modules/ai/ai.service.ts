import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AsrSdk from 'tencentcloud-sdk-nodejs-asr';
import { User } from '../user/entities/user.entity';
import { DeepDiveIntentHandler } from './intent-handlers/deepdive.intent-handler';
import { ChatHistoryService } from '../chat-history/chat-history.service';
import { AgentChatService } from './agent-chat.service';
import { MemoryExtractorService } from '../memory/memory-extractor.service';
import { MemoryService } from '../memory/memory.service';

// 基础输入输出接口
export interface InputData {
  input: string;
  userInfo: User;
  userId?: string; // 用于加载用户 skill
  location?: { lat: number; lon: number };
  forceIntent?: string; // 前端模式：'deepdive' 走深入；'todo' 偏向建待办；其余走通用 agent
  context?: string; // 深入模式：主对话历史序列化字符串
  deepDiveSessionId?: string; // 深入模式会话ID，用于隔离 Redis 记忆和 DB 存储
}

export interface ProcessedResult {
  output: string;
  intent: string;
  data?: any;
}

/** SSE 流：意图 → 若干 token / 工具事件 → 最终完成（含完整文本） */
export type AiStreamEvent =
  | { type: 'intent'; intent: string }
  | { type: 'token'; text: string }
  | { type: 'tool_call'; id: string; name: string; args: unknown }
  | {
      type: 'tool_result';
      id: string;
      name: string;
      result: string;
      ok: boolean;
      ms: number;
    }
  | { type: 'done'; output: string; intent: string; data?: any };

// 意图处理接口（deepdive handler 仍实现它）
export interface IntentHandler {
  getIntent(): string;
  process(inputData: InputData): Promise<ProcessedResult>;
}

/**
 * AI 入口服务。
 *
 * 路由极简：deepdive 模式走独立的 DeepDiveIntentHandler（隔离会话 + 只读背景 + 单独落库），
 * 其余一律交给统一的流式 tool-calling agent（AgentChatService）——
 * 由模型在一次调用里自行决定调用哪个工具或纯聊天，不再先用一次 LLM 识别意图。
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly agentChatService: AgentChatService,
    private readonly deepDiveIntentHandler: DeepDiveIntentHandler,
    private readonly chatHistoryService: ChatHistoryService,
    private readonly memoryExtractor: MemoryExtractorService,
    private readonly memoryService: MemoryService,
  ) {}

  /**
   * 自动记忆抽取（第二期）。**调用方必须 fire-and-forget，不要 await** —— 它在回复
   * 发出之后后台跑，绝不能阻塞用户拿到 done。
   *
   * confidence 驱动（见 docs/long-term-memory-design.md §3，经 eval 实测修正）：
   * - stated（用户明说）→ 直接静默写入 user_memory
   * - inferred（模型推测）→ 本期跳过（二次确认依赖 GenUI，留第三期）
   * - routeToUserField 命中 → 本期跳过（更新 User 字段的鉴权另议）
   * 整体 try/catch 包裹：抽取失败只记日志，绝不冒泡（避免未捕获 promise 异常）。
   */
  async autoExtractMemory(input: string, userId: string): Promise<void> {
    try {
      const facts = await this.memoryExtractor.extract(input);
      for (const f of facts) {
        if (f.confidence !== 'stated') {
          this.logger.debug(`记忆抽取：inferred 跳过（待二次确认）：${f.content}`);
          continue;
        }
        if (f.routeToUserField) {
          this.logger.debug(`记忆抽取：命中 User.${f.routeToUserField}，本期跳过：${f.content}`);
          continue;
        }
        // 去重：与 save_memory 工具写入的、或已存的实质相同记忆，不重复存（避免双写）
        const dup = await this.memoryService.hasSimilarActive(
          userId,
          f.subject,
          f.content,
        );
        if (dup) {
          this.logger.debug(`记忆抽取：已存在相似记忆，跳过：${f.content}`);
          continue;
        }
        await this.memoryService.create({
          userId,
          content: f.content,
          category: f.category,
          subject: f.subject,
          confidence: f.confidence,
          sensitivity: f.sensitivity,
          temporality: f.temporality,
          expiresHint: f.expiresHint ?? null,
          source: f.source,
        });
        this.logger.log(`自动记忆已存：${f.content}`);
      }
    } catch (e) {
      this.logger.warn(
        `自动记忆抽取失败（不影响对话）：${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  private isDeepDive(inputData: InputData): boolean {
    return inputData.forceIntent === 'deepdive';
  }

  // 非流式入口（保留兼容 /ai/message）：内部仍复用流式 agent，收敛成完整字符串
  async process(inputData: InputData): Promise<ProcessedResult> {
    if (this.isDeepDive(inputData)) {
      return this.deepDiveIntentHandler.process(inputData);
    }

    const gen = this.agentChatService.stream(inputData);
    let step = await gen.next();
    while (!step.done) {
      step = await gen.next();
    }
    // generator 的 return 值是 RunTrace，最终文本在 finalText
    return { output: step.value.finalText, intent: 'agent' };
  }

  /**
   * 流式处理：deepdive 走 handler 的 token 流；其余走统一 agent 的 token 流。
   * 对外事件契约保持不变：intent → token* → done。
   */
  async *streamProcess(inputData: InputData): AsyncGenerator<AiStreamEvent> {
    if (this.isDeepDive(inputData)) {
      yield { type: 'intent', intent: 'deepdive' };
      const gen = this.deepDiveIntentHandler.streamDeepDive(inputData);
      let step = await gen.next();
      while (!step.done) {
        yield { type: 'token', text: step.value as string };
        step = await gen.next();
      }
      yield { type: 'done', output: step.value as string, intent: 'deepdive' };
      return;
    }

    yield { type: 'intent', intent: 'agent' };
    const gen = this.agentChatService.stream(inputData);
    let step = await gen.next();
    while (!step.done) {
      const ev = step.value as Exclude<
        typeof step.value,
        { finalText: string }
      >;
      if (ev.type === 'token') {
        yield { type: 'token', text: ev.text };
      } else if (ev.type === 'tool_call') {
        yield { type: 'tool_call', id: ev.id, name: ev.name, args: ev.args };
      } else if (ev.type === 'tool_result') {
        yield {
          type: 'tool_result',
          id: ev.id,
          name: ev.name,
          result: ev.result,
          ok: ev.ok,
          ms: ev.ms,
        };
      }
      step = await gen.next();
    }
    // return 值是 RunTrace，最终文本在 finalText
    yield { type: 'done', output: step.value.finalText, intent: 'agent' };
  }

  /**
   * 流式回复完成后，由后端统一持久化「用户消息 + AI 回复」两条。
   *
   * 这样只要服务端确实生成完成，落库就与前端连接状态无关 —— 修复了过去
   * AI 回复仅在前端 onDone 回调里写库、断流/关页即永久丢失的问题。
   * 主对话 sessionId 用用户名（与前端读路径一致）；deepdive 用无前缀的会话 id
   * （与前端 loadSession 读取的 sid 一致），首条消息带上标题。
   */
  async handlePostProcess(
    result: ProcessedResult,
    input: string,
    userId: string,
    _userEmail: string,
    userName: string,
    deepDiveSessionId?: string,
  ): Promise<{ messageId?: string }> {
    const isDeepDive = result.intent === 'deepdive' && !!deepDiveSessionId;
    // 主对话沿用用户名作为 sessionId；deepdive 用无前缀会话 id（前端读路径一致）
    const sessionId = isDeepDive ? (deepDiveSessionId as string) : userName;
    const now = new Date().toISOString();

    // 首条消息生成会话标题（仅 deepdive 侧边栏需要）
    let title: string | undefined;
    if (isDeepDive) {
      const { total } = await this.chatHistoryService.findAll({
        sessionId,
        userId,
        limit: 1,
        offset: 0,
      });
      if (total === 0) {
        title = input.slice(0, 30);
      }
    }

    await Promise.all([
      this.chatHistoryService.create({
        content: input,
        role: 'local',
        date: now,
        sessionId,
        userId,
        ...(title ? { title } : {}),
      }),
      this.chatHistoryService.create({
        content: result.output,
        role: 'ai',
        date: now,
        sessionId,
        userId,
      }),
    ]);

    return {};
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

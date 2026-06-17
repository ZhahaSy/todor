import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AsrSdk from 'tencentcloud-sdk-nodejs-asr';
import { User } from '../user/entities/user.entity';
import { DeepDiveIntentHandler } from './intent-handlers/deepdive.intent-handler';
import { ChatHistoryService } from '../chat-history/chat-history.service';
import { AgentChatService } from './agent-chat.service';

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

/** SSE 流：意图 → 若干 token → 最终完成（含完整文本） */
export type AiStreamEvent =
  | { type: 'intent'; intent: string }
  | { type: 'token'; text: string }
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
  ) {}

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
    return { output: step.value as string, intent: 'agent' };
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
      yield { type: 'token', text: step.value as string };
      step = await gen.next();
    }
    yield { type: 'done', output: step.value as string, intent: 'agent' };
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

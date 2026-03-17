import { IntentHandler, InputData, ProcessedResult } from '../ai.service';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { RedisChatMemory } from '../memory/redis-chat-memory';
import Redis from 'ioredis';

export abstract class BaseIntentHandler implements IntentHandler {
  abstract getIntent(): string;
  abstract process(inputData: InputData): Promise<ProcessedResult>;

  /**
   * Memory scope strategy
   * - 'global': 所有意图共享同一个对话历史（推荐，支持跨意图上下文）
   * - 'intent': 每个意图独立的对话历史（适合需要隔离上下文的场景）
   * 子类可以通过覆盖此属性来改变默认策略
   */
  protected readonly memoryScope: 'global' | 'intent' = 'global';

  protected formatResponse(
    output: string,
    intent: string,
    data?: any,
  ): ProcessedResult {
    return {
      output,
      intent,
      data,
    };
  }

  /**
   * Create global memory shared across all intents (推荐)
   * 所有意图共享同一个对话历史，适合需要跨意图上下文的场景
   * @param redis Redis client instance
   * @param inputData User input data
   * @param options Optional configuration for memory
   * @returns RedisChatMemory instance
   */
  protected createGlobalMemory(
    redis: Redis,
    inputData: InputData,
    options?: {
      k?: number;
      ttl?: number;
      memoryKey?: string;
      returnMessages?: boolean;
    },
  ): RedisChatMemory {
    return new RedisChatMemory({
      redis,
      sessionId: `user:${inputData.userInfo.id}:global`,
      k: options?.k ?? 10,
      ttl: options?.ttl ?? 3600 * 24 * 7, // 7 days default
      memoryKey: options?.memoryKey ?? 'history',
      returnMessages: options?.returnMessages ?? false,
    });
  }

  /**
   * Create intent-specific memory (原有方法，保留向后兼容)
   * 每个意图有独立的对话历史，适合需要隔离上下文的场景
   * @param redis Redis client instance
   * @param inputData User input data
   * @param options Optional configuration for memory
   * @returns RedisChatMemory instance
   */
  protected createIntentMemory(
    redis: Redis,
    inputData: InputData,
    options?: {
      k?: number;
      ttl?: number;
      memoryKey?: string;
      returnMessages?: boolean;
    },
  ): RedisChatMemory {
    return new RedisChatMemory({
      redis,
      sessionId: `user:${inputData.userInfo.id}:${this.getIntent()}`,
      k: options?.k ?? 10,
      ttl: options?.ttl ?? 3600 * 24 * 7, // 7 days default
      memoryKey: options?.memoryKey ?? 'history',
      returnMessages: options?.returnMessages ?? false,
    });
  }

  /**
   * Create memory based on strategy (智能选择)
   * 默认使用全局记忆，子类可以通过设置 memoryScope 改变策略
   * @param redis Redis client instance
   * @param inputData User input data
   * @param options Optional configuration for memory
   * @returns RedisChatMemory instance
   */
  protected createMemory(
    redis: Redis,
    inputData: InputData,
    options?: {
      k?: number;
      ttl?: number;
      memoryKey?: string;
      returnMessages?: boolean;
      scope?: 'global' | 'intent'; // 允许临时覆盖策略
    },
  ): RedisChatMemory {
    const scope = options?.scope ?? this.memoryScope;

    if (scope === 'global') {
      return this.createGlobalMemory(redis, inputData, options);
    } else {
      return this.createIntentMemory(redis, inputData, options);
    }
  }

  /**
   * Load chat history from memory
   * @param memory RedisChatMemory instance
   * @returns Chat history string or empty message
   */
  protected async loadChatHistory(memory: RedisChatMemory): Promise<string> {
    const memoryVariables = await memory.loadMemoryVariables({});
    return memoryVariables.history || '暂无历史对话';
  }

  /**
   * Save conversation to memory
   * @param memory RedisChatMemory instance
   * @param input User input
   * @param output AI output
   */
  protected async saveToMemory(
    memory: RedisChatMemory,
    input: string,
    output: string,
  ): Promise<void> {
    await memory.saveContext({ input }, { output });
  }

  /**
   * Load history from specific intent (跨意图访问)
   * 允许当前意图访问其他意图的历史记录
   * @param redis Redis client instance
   * @param inputData User input data
   * @param targetIntent Target intent name (e.g., 'chat', 'todo')
   * @param options Optional configuration
   * @returns Chat history string or empty message
   */
  protected async loadCrossIntentHistory(
    redis: Redis,
    inputData: InputData,
    targetIntent: string,
    options?: { k?: number },
  ): Promise<string> {
    const memory = new RedisChatMemory({
      redis,
      sessionId: `user:${inputData.userInfo.id}:${targetIntent}`,
      k: options?.k ?? 10,
      ttl: 3600 * 24 * 7,
      memoryKey: 'history',
      returnMessages: false,
    });

    const memoryVariables = await memory.loadMemoryVariables({});
    return memoryVariables.history || '';
  }

  /**
   * Load combined history from multiple sources
   * 加载并合并多个来源的历史记录
   * @param redis Redis client instance
   * @param inputData User input data
   * @param sources Array of sources: 'global' or specific intent names
   * @returns Combined chat history string
   */
  protected async loadCombinedHistory(
    redis: Redis,
    inputData: InputData,
    sources: Array<'global' | string>,
  ): Promise<string> {
    const histories: string[] = [];

    for (const source of sources) {
      let history: string;

      if (source === 'global') {
        const memory = this.createGlobalMemory(redis, inputData);
        history = await this.loadChatHistory(memory);
      } else {
        history = await this.loadCrossIntentHistory(redis, inputData, source);
      }

      if (history && history !== '暂无历史对话') {
        histories.push(`[${source}对话]\n${history}`);
      }
    }

    return histories.length > 0
      ? histories.join('\n\n---\n\n')
      : '暂无历史对话';
  }

  /**
   * Clear memory for specific scope
   * 清除指定范围的记忆
   * @param redis Redis client instance
   * @param inputData User input data
   * @param scope Memory scope to clear
   */
  protected async clearMemory(
    redis: Redis,
    inputData: InputData,
    scope: 'global' | 'intent' = 'global',
  ): Promise<void> {
    const sessionId =
      scope === 'global'
        ? `user:${inputData.userInfo.id}:global`
        : `user:${inputData.userInfo.id}:${this.getIntent()}`;

    await redis.del(sessionId);
  }

  /**
   * Create memory with an explicit Redis session key
   * 使用指定的 sessionId 创建 memory（适合需要自定义 key 隔离的场景）
   */
  protected createIntentMemoryWithKey(
    redis: Redis,
    _inputData: InputData,
    sessionId: string,
    options?: {
      k?: number;
      ttl?: number;
      memoryKey?: string;
      returnMessages?: boolean;
    },
  ): RedisChatMemory {
    return new RedisChatMemory({
      redis,
      sessionId,
      k: options?.k ?? 10,
      ttl: options?.ttl ?? 3600 * 24 * 7,
      memoryKey: options?.memoryKey ?? 'history',
      returnMessages: options?.returnMessages ?? false,
    });
  }

  protected buildPrompt(systemMessage: string) {
    // Common context that should be included in all prompts
    const commonContext = `
      当前时间：${new Date().toLocaleString()}
      用户档案：
      姓名：{name}
      年龄：{age}
      性别：{gender}
      兴趣：{hobby}
    `;

    return ChatPromptTemplate.fromMessages([
      ['system', commonContext + systemMessage],
      ['human', '{input}'],
    ]);
  }

  /**
   * Build prompt with chat history included
   * @param systemMessage System message
   * @param chatHistory Chat history string
   * @returns ChatPromptTemplate with history
   */
  protected buildPromptWithHistory(
    systemMessage: string,
    chatHistory: string,
  ): ChatPromptTemplate {
    // Escape curly braces in chatHistory to prevent LangChain template parsing errors
    const escapedChatHistory = chatHistory
      .replace(/\{/g, '{{')
      .replace(/\}/g, '}}');

    const contextWithHistory = `${systemMessage}

对话历史：
${escapedChatHistory}

当前时间：${new Date().toLocaleString()}
用户档案：
姓名：{name}
年龄：{age}
性别：{gender}
兴趣：{hobby}`;

    return ChatPromptTemplate.fromMessages([
      ['system', contextWithHistory],
      ['human', '{input}'],
    ]);
  }
}

import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import {
  BaseChatMemory,
  BaseChatMemoryInput,
} from '@langchain/community/memory/chat_memory';
import {
  InputValues,
  MemoryVariables,
  OutputValues,
} from '@langchain/core/memory';
import Redis from 'ioredis';

export interface RedisChatMemoryInput extends BaseChatMemoryInput {
  redis: Redis;
  sessionId: string;
  memoryKey?: string;
  k?: number; // Number of messages to keep in the window
  ttl?: number; // Time to live in seconds
}

/**
 * Redis-backed BufferWindowMemory implementation
 * Stores chat history in Redis with a sliding window of recent messages
 */
export class RedisChatMemory extends BaseChatMemory {
  private redis: Redis;
  private sessionId: string;
  private memoryKey: string;
  private k: number;
  private ttl?: number;

  constructor(fields: RedisChatMemoryInput) {
    super({
      returnMessages: fields.returnMessages ?? false,
      inputKey: fields.inputKey,
      outputKey: fields.outputKey,
    });
    this.redis = fields.redis;
    this.sessionId = fields.sessionId;
    this.memoryKey = fields.memoryKey ?? 'chat_history';
    this.k = fields.k ?? 10; // Default to last 10 messages
    this.ttl = fields.ttl; // Optional TTL
  }

  /**
   * Get memory keys - required by BaseChatMemory
   */
  get memoryKeys(): string[] {
    return [this.memoryKey];
  }

  /**
   * Generate Redis key for this session
   */
  private getRedisKey(): string {
    return `memory:${this.sessionId}:${this.memoryKey}`;
  }

  /**
   * Load chat history from Redis
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async loadMemoryVariables(_values: InputValues): Promise<MemoryVariables> {
    const key = this.getRedisKey();
    const messagesJson = await this.redis.lrange(key, -this.k, -1);

    const messages: BaseMessage[] = messagesJson.map((msg) => {
      const parsed = JSON.parse(msg);
      if (parsed.type === 'human') {
        return new HumanMessage(parsed.content);
      } else if (parsed.type === 'ai') {
        return new AIMessage(parsed.content);
      }
      return new HumanMessage(parsed.content);
    });

    if (this.returnMessages) {
      return {
        [this.memoryKey]: messages,
      };
    }

    // Return as string format
    return {
      [this.memoryKey]: messages
        .map((msg) => `${msg._getType()}: ${msg.content}`)
        .join('\n'),
    };
  }

  /**
   * Save context to Redis
   */
  async saveContext(
    inputValues: InputValues,
    outputValues: OutputValues,
  ): Promise<void> {
    const key = this.getRedisKey();

    // Get input and output keys
    const input = this.inputKey
      ? inputValues[this.inputKey]
      : Object.values(inputValues)[0];
    const output = this.outputKey
      ? outputValues[this.outputKey]
      : Object.values(outputValues)[0];

    // Save human message
    const humanMessage = JSON.stringify({
      type: 'human',
      content: input,
    });
    await this.redis.rpush(key, humanMessage);

    // Save AI message
    const aiMessage = JSON.stringify({
      type: 'ai',
      content: output,
    });
    await this.redis.rpush(key, aiMessage);

    // Set TTL if specified
    if (this.ttl) {
      await this.redis.expire(key, this.ttl);
    }

    // Trim to keep only the last k messages (k is for single messages, so k*2 for pairs)
    const totalMessages = this.k * 2;
    await this.redis.ltrim(key, -totalMessages, -1);
  }

  /**
   * Clear memory for this session
   */
  async clear(): Promise<void> {
    const key = this.getRedisKey();
    await this.redis.del(key);
  }

  /**
   * Get all messages without window limit (for debugging)
   */
  async getAllMessages(): Promise<BaseMessage[]> {
    const key = this.getRedisKey();
    const messagesJson = await this.redis.lrange(key, 0, -1);

    return messagesJson.map((msg) => {
      const parsed = JSON.parse(msg);
      if (parsed.type === 'human') {
        return new HumanMessage(parsed.content);
      } else if (parsed.type === 'ai') {
        return new AIMessage(parsed.content);
      }
      return new HumanMessage(parsed.content);
    });
  }

  /**
   * Get message count
   */
  async getMessageCount(): Promise<number> {
    const key = this.getRedisKey();
    return await this.redis.llen(key);
  }
}

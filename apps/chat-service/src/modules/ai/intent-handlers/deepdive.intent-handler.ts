import { Injectable } from '@nestjs/common';
import { BaseIntentHandler } from './base.intent-handler';
import { InputData, ProcessedResult } from '../ai.service';
import { RedisService } from '../../redis/redis.service';
import { AiModelProvider } from '../ai-model.provider';

@Injectable()
export class DeepDiveIntentHandler extends BaseIntentHandler {
  protected readonly memoryScope: 'global' | 'intent' = 'intent';

  constructor(
    private aiModelProvider: AiModelProvider,
    private redisService: RedisService,
  ) {
    super();
  }

  getIntent(): string {
    return 'deepdive';
  }

  async process(inputData: InputData): Promise<ProcessedResult> {
    const model = this.aiModelProvider.getModel(0.3);

    // 每个深入会话有独立的 Redis key：user:{id}:deepdive:{sessionId}
    // 若无 sessionId 则降级为 user:{id}:deepdive（向后兼容）
    const sessionSuffix = inputData.deepDiveSessionId
      ? `:${inputData.deepDiveSessionId}`
      : '';
    const redis = this.redisService.getClient();
    const memory = this.createIntentMemoryWithKey(
      redis,
      inputData,
      `user:${inputData.userInfo.id}:deepdive${sessionSuffix}`,
    );
    const chatHistory = await this.loadChatHistory(memory);

    const contextContent = inputData.context ?? '（无）';
    const escapedContext = contextContent
      .replace(/\{/g, '{{')
      .replace(/\}/g, '}}');

    const systemMessage = `你是一个专注的知识助手。
只能基于以下提供的上下文内容回答，不能使用上下文以外的知识。
若问题超出上下文范围，明确告知"根据您提供的内容，无法回答此问题"。

===== 上下文 =====
${escapedContext}
===== 结束 =====

要求：严格基于上下文，引用具体内容，如上下文不完整如实说明。`;

    const prompt = this.buildPromptWithHistory(systemMessage, chatHistory);

    const chain = prompt.pipe(model);
    const response = await chain.invoke({
      input: inputData.input,
      name: inputData.userInfo.name,
      age: inputData.userInfo.age,
      gender: inputData.userInfo.gender,
      hobby: inputData.userInfo.hobby,
    });

    const content =
      typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);

    await this.saveToMemory(memory, inputData.input, content);

    return this.formatResponse(content, this.getIntent());
  }
}

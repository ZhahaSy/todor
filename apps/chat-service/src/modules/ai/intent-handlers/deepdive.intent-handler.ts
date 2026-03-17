import { Injectable } from '@nestjs/common';
import { ChatPromptTemplate } from '@langchain/core/prompts';
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

    const contextContent = (inputData.context ?? '').trim();
    const escapedContext = contextContent
      .replace(/\{/g, '{{')
      .replace(/\}/g, '}}');

    // 深入会话自身的对话历史（Redis）
    const escapedHistory = chatHistory
      .replace(/\{/g, '{{')
      .replace(/\}/g, '}}');

    const systemMessage = `你是一个专注的深度分析助手。
你的任务是基于用户提供的【背景对话】进行深入探讨。

【背景对话（只读，供参考，不可修改）】
${escapedContext || '（无背景对话）'}
【背景对话结束】

【本次深入对话历史】
${escapedHistory === '暂无历史对话' ? '（对话刚开始）' : escapedHistory}
【历史结束】

要求：
1. 严格区分"背景对话"和"本次深入对话历史"，不要混淆两者的说话人
2. 回答问题时优先基于背景对话内容，结合本次对话历史保持连贯
3. 若问题超出背景对话范围，可基于通用知识回答，但需注明"背景对话中未提及"
4. 对话历史中的"Human/AI"指的是本次深入对话，不是背景对话中的人物

当前时间：${new Date().toLocaleString()}
用户档案：姓名 {name}，年龄 {age}，性别 {gender}，兴趣 {hobby}`;

    const prompt = this.buildDeepDivePrompt(systemMessage);

    const chain = prompt.pipe(model);
    const response = await chain.invoke({ input: inputData.input });

    const content =
      typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);

    await this.saveToMemory(memory, inputData.input, content);

    return this.formatResponse(content, this.getIntent());
  }

  /** 专用 prompt：system 已内联所有上下文，不使用模板变量避免二次渲染 */
  private buildDeepDivePrompt(systemMessage: string): ChatPromptTemplate {
    return ChatPromptTemplate.fromMessages([
      ['system', systemMessage],
      ['human', '{input}'],
    ]);
  }
}

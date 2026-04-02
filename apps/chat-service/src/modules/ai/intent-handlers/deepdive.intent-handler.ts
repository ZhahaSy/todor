import { Injectable } from '@nestjs/common';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { BaseMessage } from '@langchain/core/messages';
import { BaseIntentHandler } from './base.intent-handler';
import { InputData, ProcessedResult } from '../ai.service';
import { RedisService } from '../../redis/redis.service';
import { AiModelProvider } from '../ai-model.provider';
import { extractTokenText } from '../utils/langchain-stream';
import { RedisChatMemory } from '../memory/redis-chat-memory';

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

  private async buildDeepDiveChain(inputData: InputData): Promise<{
    model: ReturnType<AiModelProvider['getModel']>;
    memory: RedisChatMemory;
    prompt: ChatPromptTemplate;
    chatHistory: BaseMessage[];
  }> {
    const model = this.aiModelProvider.getModel(0.3);

    const sessionSuffix = inputData.deepDiveSessionId
      ? `:${inputData.deepDiveSessionId}`
      : '';
    const redis = this.redisService.getClient();
    const memory = this.createIntentMemoryWithKey(
      redis,
      inputData,
      `user:${inputData.userInfo.id}:deepdive${sessionSuffix}`,
      { returnMessages: true },
    );
    const chatHistory = await this.loadChatHistory(memory);

    const contextContent = (inputData.context ?? '').trim();
    const escapedContext = contextContent
      .replace(/\{/g, '{{')
      .replace(/\}/g, '}}');

    const systemMessage = `你是一个深度分析助手，帮用户深入探讨背景对话中的内容。

【背景对话（只读参考）】
${escapedContext || '（无背景对话）'}
【背景对话结束】

回复风格要求：
- 直接给出观点或答案，不要展示推理过程和分析步骤
- 用自然口语表达，不要像在写分析报告
- 不要用"首先…其次…最后…"拆解问题
- 超出背景对话范围时直接回答，简单带一句"背景里没提到"即可
- 严格区分背景对话和本次对话的说话人，不要混淆

当前时间：${new Date().toLocaleString()}
用户：${inputData.userInfo.name}`;

    const prompt = this.buildDeepDivePrompt(systemMessage);
    return { model, memory, prompt, chatHistory };
  }

  async process(inputData: InputData): Promise<ProcessedResult> {
    const { model, memory, prompt, chatHistory } = await this.buildDeepDiveChain(inputData);
    const chain = prompt.pipe(model);
    const response = await chain.invoke({ input: inputData.input, chat_history: chatHistory });

    const content =
      typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);

    await this.saveToMemory(memory, inputData.input, content);
    return this.formatResponse(content, this.getIntent());
  }

  async *streamDeepDive(inputData: InputData): AsyncGenerator<string, string> {
    const { model, memory, prompt, chatHistory } = await this.buildDeepDiveChain(inputData);
    const chain = prompt.pipe(model);

    let full = '';
    const stream = await chain.stream({ input: inputData.input, chat_history: chatHistory });

    for await (const chunk of stream) {
      const piece = extractTokenText(chunk);
      if (piece) {
        full += piece;
        yield piece;
      }
    }

    await this.saveToMemory(memory, inputData.input, full);
    return full;
  }

  private buildDeepDivePrompt(systemMessage: string): ChatPromptTemplate {
    return ChatPromptTemplate.fromMessages([
      ['system', systemMessage],
      new MessagesPlaceholder('chat_history'),
      ['human', '{input}'],
    ]);
  }
}

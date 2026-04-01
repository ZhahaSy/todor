import { Injectable } from '@nestjs/common';
import { BaseIntentHandler } from './base.intent-handler';
import { InputData, ProcessedResult } from '../ai.service';
import { RedisService } from '../../redis/redis.service';
import { AiModelProvider } from '../ai-model.provider';
import { extractTokenText } from '../utils/langchain-stream';

@Injectable()
export class ChatIntentHandler extends BaseIntentHandler {
  constructor(
    private aiModelProvider: AiModelProvider,
    private redisService: RedisService,
  ) {
    super();
  }

  getIntent(): string {
    return 'chat';
  }

  async process(inputData: InputData): Promise<ProcessedResult> {
    // 使用 AI 模型提供者获取模型实例（temperature=0.7 用于聊天）
    const model = this.aiModelProvider.getModel(0.7);

    // Create memory using base class method (默认使用全局记忆，支持跨意图访问)
    const memory = this.createMemory(this.redisService.getClient(), inputData);

    // Load chat history using base class method
    const chatHistory = await this.loadChatHistory(memory);

    // Build prompt with history using base class method
    const systemMessage = `你是todor，一个专业的私人助手。你可以：
1. 帮助用户管理待办事项（添加、删除、更新、查看待办列表）
2. 与用户进行自然、友好的日常对话
3. 提供及时、准确的信息和建议
4. 保持对话的连贯性和上下文理解
请以亲切、专业的语气与用户交流。`;

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

    // Save the conversation to memory using base class method
    await this.saveToMemory(memory, inputData.input, content);

    return this.formatResponse(content, this.getIntent());
  }

  /** 流式输出聊天回复；结束后已将完整内容写入 Redis 记忆 */
  async *streamChat(inputData: InputData): AsyncGenerator<string, string> {
    const model = this.aiModelProvider.getModel(0.7);
    const memory = this.createMemory(this.redisService.getClient(), inputData);
    const chatHistory = await this.loadChatHistory(memory);

    const systemMessage = `你是todor，一个专业的私人助手。你可以：
1. 帮助用户管理待办事项（添加、删除、更新、查看待办列表）
2. 与用户进行自然、友好的日常对话
3. 提供及时、准确的信息和建议
4. 保持对话的连贯性和上下文理解
请以亲切、专业的语气与用户交流。`;

    const prompt = this.buildPromptWithHistory(systemMessage, chatHistory);
    const chain = prompt.pipe(model);

    let full = '';
    const stream = await chain.stream({
      input: inputData.input,
      name: inputData.userInfo.name,
      age: inputData.userInfo.age,
      gender: inputData.userInfo.gender,
      hobby: inputData.userInfo.hobby,
    });

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
}

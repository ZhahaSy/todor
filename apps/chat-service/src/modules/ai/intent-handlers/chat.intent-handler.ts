import { Injectable } from '@nestjs/common';
import { BaseIntentHandler } from './base.intent-handler';
import { InputData, ProcessedResult } from '../ai.service';
import { RedisService } from '../../redis/redis.service';
import { AiModelProvider } from '../ai-model.provider';
import { extractTokenText } from '../utils/langchain-stream';
import { RedisChatMemory } from '../memory/redis-chat-memory';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { AIMessage, AIMessageChunk, ToolMessage } from '@langchain/core/messages';
import { createGetUserInfoTool } from '../tools/get-user-info.tool';

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

  private async buildChain(inputData: InputData): Promise<{
    model: ReturnType<AiModelProvider['getModel']>;
    memory: RedisChatMemory;
    prompt: ChatPromptTemplate;
    invokeArgs: Record<string, unknown>;
  }> {
    const model = this.aiModelProvider.getModel(0.7);
    const memory = this.createMemory(this.redisService.getClient(), inputData, { returnMessages: true });
    const chatHistory = await this.loadChatHistory(memory);

    const systemMessage = `你是 Todor，用户的私人助手。
需要用户个人信息时调用 get_user_info 工具，不要主动提及用户档案。

回复风格要求：
- 直接给出答案，不要展示推理过程、分析步骤或内心思考
- 用自然口语表达，像朋友聊天一样，不要像在写报告
- 不要用"首先…其次…最后…"这类机械结构拆解问题
- 不要重复用户说过的话来"确认理解"
- 回复简洁，能一句话说清楚就不说两句`;

    const prompt = this.buildPromptWithHistory(systemMessage);
    const invokeArgs = { input: inputData.input, chat_history: chatHistory };

    return { model, memory, prompt, invokeArgs };
  }

  async process(inputData: InputData): Promise<ProcessedResult> {
    const { model, memory, prompt, invokeArgs } = await this.buildChain(inputData);
    const userInfoTool = createGetUserInfoTool(inputData.userInfo);
    const modelWithTools = model.bindTools([userInfoTool]);

    const formattedMessages = await prompt.formatMessages(invokeArgs);
    let response = await modelWithTools.invoke(formattedMessages);

    if (response.tool_calls?.length > 0) {
      const toolResults = await Promise.all(
        response.tool_calls.map(async (tc) => {
          const result = await userInfoTool.invoke(tc.args ?? {});
          return new ToolMessage({ content: result, tool_call_id: tc.id! });
        }),
      );
      response = await model.invoke([...formattedMessages, response as AIMessage, ...toolResults]);
    }

    const content =
      typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);

    await this.saveToMemory(memory, inputData.input, content);
    return this.formatResponse(content, this.getIntent());
  }

  async *streamChat(inputData: InputData): AsyncGenerator<string, string> {
    const { model, memory, prompt, invokeArgs } = await this.buildChain(inputData);
    const userInfoTool = createGetUserInfoTool(inputData.userInfo);
    const modelWithTools = model.bindTools([userInfoTool]);

    const formattedMessages = await prompt.formatMessages(invokeArgs);

    let textContent = '';
    let accumulatedChunk: AIMessageChunk | null = null;

    // 流式输出，同时累积完整的 AI message chunk（tool_calls 是 delta，需要 concat 合并）
    const stream = await modelWithTools.stream(formattedMessages);
    for await (const chunk of stream) {
      const piece = extractTokenText(chunk);
      if (piece) {
        textContent += piece;
        yield piece;
      }
      accumulatedChunk = accumulatedChunk ? accumulatedChunk.concat(chunk as AIMessageChunk) : (chunk as AIMessageChunk);
    }

    const toolCalls = accumulatedChunk?.tool_calls ?? [];

    if (toolCalls.length > 0) {
      // 执行工具，流式输出最终回复
      const aiMessage = new AIMessage({ content: textContent, tool_calls: toolCalls });
      const toolResults = await Promise.all(
        toolCalls.map(async (tc) => {
          const result = await userInfoTool.invoke(tc.args ?? {});
          return new ToolMessage({ content: result, tool_call_id: tc.id! });
        }),
      );

      let full = '';
      const finalStream = await model.stream([...formattedMessages, aiMessage, ...toolResults]);
      for await (const chunk of finalStream) {
        const piece = extractTokenText(chunk);
        if (piece) {
          full += piece;
          yield piece;
        }
      }
      await this.saveToMemory(memory, inputData.input, full);
      return full;
    }

    await this.saveToMemory(memory, inputData.input, textContent);
    return textContent;
  }
}

import { IntentHandler, InputData, ProcessedResult } from '../ai.service';
import { ChatPromptTemplate } from '@langchain/core/prompts';

export abstract class BaseIntentHandler implements IntentHandler {
  abstract getIntent(): string;
  abstract process(inputData: InputData): Promise<ProcessedResult>;

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
}

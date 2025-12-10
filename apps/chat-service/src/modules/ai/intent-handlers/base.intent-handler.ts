import { IntentHandler, InputData, ProcessedResult } from '../ai.service';

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
}

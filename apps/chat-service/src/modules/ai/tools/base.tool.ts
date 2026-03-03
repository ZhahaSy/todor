import { StructuredTool } from '@langchain/core/tools';
import { Logger } from '@nestjs/common';

export abstract class BaseTool extends StructuredTool {
  protected readonly logger = new Logger(this.constructor.name);

  abstract readonly category: 'data' | 'communication' | 'automation';
}

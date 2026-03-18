import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatDeepSeek } from '@langchain/deepseek';

/**
 * AI 模型提供者
 * 使用单例模式管理 AI 模型实例，避免重复初始化
 */
@Injectable()
export class AiModelProvider {
  private readonly logger = new Logger(AiModelProvider.name);
  private chatModel: ChatDeepSeek;

  constructor(private configService: ConfigService) {
    this.initializeModel();
  }

  /**
   * 初始化 AI 模型
   */
  private initializeModel(): void {
    const { apiKey, model, timeout, baseURL, configuration } =
      this.getModelConfig();

    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY is not configured');
    }

    this.chatModel = new ChatDeepSeek({
      apiKey,
      model,
      temperature: 0.7,
      timeout,
      configuration,
    });

    this.logger.log(`AI 模型初始化成功: model=${model}, baseURL=${baseURL}`);
  }

  private getModelConfig() {
    const apiKey = this.configService.get<string>('DEEPSEEK_API_KEY');
    const model = this.configService.get<string>('AI_MODEL', 'deepseek-chat');
    const baseURL =
      this.configService.get<string>('DEEPSEEK_BASE_URL') ||
      this.configService.get<string>('OPENAI_BASE_URL') ||
      'https://api.deepseek.com';
    const timeout = Number(
      this.configService.get<string>('AI_REQUEST_TIMEOUT_MS', '60000'),
    );

    return {
      apiKey,
      model,
      timeout,
      baseURL,
      configuration: {
        baseURL,
      },
    };
  }

  /**
   * 获取 AI 模型实例
   * @param temperature 可选的温度参数，如果与默认值不同则创建新实例
   * @returns ChatDeepSeek 实例
   */
  getModel(temperature?: number): ChatDeepSeek {
    // 如果指定了不同的温度参数，创建新实例
    if (temperature !== undefined && temperature !== 0.7) {
      this.logger.debug(`创建临时 AI 模型实例，temperature=${temperature}`);
      const { apiKey, model, timeout, configuration } = this.getModelConfig();
      return new ChatDeepSeek({
        apiKey,
        model,
        temperature,
        timeout,
        configuration,
      });
    }

    // 返回单例实例
    return this.chatModel;
  }

  /**
   * 创建自定义配置的模型实例
   * @param options 自定义配置选项
   * @returns ChatDeepSeek 实例
   */
  createCustomModel(options: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  }): ChatDeepSeek {
    const { apiKey, model, timeout, configuration } = this.getModelConfig();
    return new ChatDeepSeek({
      apiKey,
      model,
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens,
      topP: options.topP,
      timeout,
      configuration,
    });
  }
}

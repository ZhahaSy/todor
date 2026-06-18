import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  BadRequestException,
  HttpException,
  Res,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

import { AiService, InputData } from './ai.service';
import { AiQuotaService } from './ai-quota.service';

import { SendMessageDto } from './dto/send-message.dto';
import { AsrRecognizeDto } from './dto/asr-recognize.dto';

import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { ResOp } from '@/common/model/response.model';
import { JwtAuthGuard } from '@/common/guard/jwt.auth';
import { UserService } from '../user/user.service';

@ApiTags('AI接口')
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(
    private readonly aiService: AiService,
    private readonly userService: UserService,
    private readonly aiQuotaService: AiQuotaService,
  ) {}

  /**
   * 消费一次 AI 配额，超额则抛 429。
   * 放在 buildInputData 之外、真正调用 LLM 之前，避免无谓占用模型调用。
   */
  private async assertQuota(userId: string): Promise<void> {
    const { allowed, used, limit } = await this.aiQuotaService.consume(userId);
    if (!allowed) {
      throw new HttpException(
        {
          code: HttpStatus.TOO_MANY_REQUESTS,
          msg: `今日 AI 对话次数已达上限（${limit} 次/天，已用 ${used} 次），请明天再试。`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private buildInputData(dto: SendMessageDto, req: any): InputData {
    return {
      input: dto.input,
      userInfo: {
        id: req.user.userId,
        name: req.user.name,
        email: req.user.email,
        age: req.user.age,
        gender: req.user.gender,
        hobby: req.user.hobby,
      } as any,
      userId: req.user.userId,
      location: dto.location,
      forceIntent: dto.mode,
      context: dto.context,
      deepDiveSessionId: dto.deepDiveSessionId,
    };
  }

  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '发送消息',
    description: '向AI发送消息并获取回复，自动识别用户意图并调用相应处理逻辑',
  })
  @ApiBody({ type: SendMessageDto })
  @Post('message')
  async sendMessage(@Body() sendMessageDto: SendMessageDto, @Request() req) {
    this.logger.log('sendMessage-user: ' + JSON.stringify(req.user));
    await this.assertQuota(req.user.userId);
    const inputData = this.buildInputData(sendMessageDto, req);
    this.logger.log(JSON.stringify(inputData));

    const processedResult = await this.aiService.process(inputData);
    this.logger.log(JSON.stringify(processedResult));

    const extra = await this.aiService.handlePostProcess(
      processedResult,
      sendMessageDto.input,
      req.user.userId,
      req.user.email,
      req.user.name,
      sendMessageDto.deepDiveSessionId,
    );

    return ResOp.success({
      output: processedResult.output,
      intent: processedResult.intent,
      ...extra,
    });
  }

  @ApiOperation({
    summary: '发送消息（流式）',
    description:
      'SSE：event:intent → event:token（若干）→ event:done；chat/deepdive 为 token 流，其余意图仅在 done 中返回完整结果',
  })
  @ApiBody({ type: SendMessageDto })
  @Post('message/stream')
  async sendMessageStream(
    @Body() sendMessageDto: SendMessageDto,
    @Request() req,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    // 配额检查必须在写 SSE 响应头之前：一旦切到 event-stream，就无法再返回标准 429。
    // 这里手动判断（passthrough:false 下抛 HttpException 不会被异常过滤器接管）。
    const quota = await this.aiQuotaService.consume(req.user.userId);
    if (!quota.allowed) {
      res.status(HttpStatus.TOO_MANY_REQUESTS).json({
        code: HttpStatus.TOO_MANY_REQUESTS,
        msg: `今日 AI 对话次数已达上限（${quota.limit} 次/天，已用 ${quota.used} 次），请明天再试。`,
      });
      return;
    }

    const inputData = this.buildInputData(sendMessageDto, req);

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    (res as Response & { flushHeaders?: () => void }).flushHeaders?.();

    const writeSse = (event: string, data: Record<string, unknown>) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      for await (const ev of this.aiService.streamProcess(inputData)) {
        if (ev.type === 'intent') {
          writeSse('intent', { intent: ev.intent });
          continue;
        }
        if (ev.type === 'token') {
          writeSse('token', { t: ev.text });
          continue;
        }
        if (ev.type === 'done') {
          const extra = await this.aiService.handlePostProcess(
            { output: ev.output, intent: ev.intent, data: ev.data },
            sendMessageDto.input,
            req.user.userId,
            req.user.email,
            req.user.name,
            sendMessageDto.deepDiveSessionId,
          );
          writeSse('done', {
            output: ev.output,
            intent: ev.intent,
            data: ev.data,
            ...extra,
          });
        }
      }
    } catch (e) {
      writeSse('error', {
        message: e instanceof Error ? e.message : String(e),
      });
    }
    res.end();
  }

  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '语音识别', description: '将音频转换为文字（腾讯云 ASR）' })
  @ApiBody({ type: AsrRecognizeDto })
  @Post('asr/recognize')
  async recognizeAudio(@Body() dto: AsrRecognizeDto) {
    if (!dto.audioData) {
      throw new BadRequestException('audioData is required');
    }
    const text = await this.aiService.recognizeAudio(
      dto.audioData,
      dto.format,
      dto.dataLen,
      dto.engSerViceType,
    );
    return ResOp.success(text);
  }
}

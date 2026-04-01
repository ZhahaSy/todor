import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  BadRequestException,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';

import { AiService, InputData, ProcessedResult } from './ai.service';

import { SendMessageDto } from './dto/send-message.dto';
import { AsrRecognizeDto } from './dto/asr-recognize.dto';

import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { ResOp } from '@/common/model/response.model';
import { TodoService } from '../todo/todo.service';
import { JwtAuthGuard } from '@/common/guard/jwt.auth';
import { UserService } from '../user/user.service';
import { AdvancedSchedulerService } from '../schedule/advanced-scheduler.service';
import { ChatHistoryService } from '../chat-history/chat-history.service';

@ApiTags('AI接口')
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly todoService: TodoService,
    private readonly userService: UserService,
    private readonly scheduleService: AdvancedSchedulerService,
    private readonly chatHistoryService: ChatHistoryService,
  ) {}

  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '发送消息',
    description: '向AI发送消息并获取回复，自动识别用户意图并调用相应处理逻辑',
  })
  @ApiBody({ type: SendMessageDto })
  @Post('message')
  async sendMessage(@Body() sendMessageDto: SendMessageDto, @Request() req) {
    // 直接从 JWT payload 中获取用户信息，避免数据库查询
    const userInfo = {
      id: req.user.userId,
      name: req.user.name,
      email: req.user.email,
      age: req.user.age,
      gender: req.user.gender,
      hobby: req.user.hobby,
    };
    console.log('sendMessage-user', req.user);

    // 构建输入数据（mode 有值时直接映射为 forceIntent，跳过 LLM 意图识别）
    const inputData: InputData = {
      input: sendMessageDto.input,
      userInfo: userInfo as any,
      userId: req.user.userId,
      location: sendMessageDto.location,
      forceIntent: sendMessageDto.mode,
      context: sendMessageDto.context,
      deepDiveSessionId: sendMessageDto.deepDiveSessionId,
    };

    console.log(inputData);
    // 调用AI服务处理消息（内部已包含意图识别和处理）
    const processedResult: ProcessedResult =
      await this.aiService.process(inputData);

    console.log(processedResult);

    //根据意图执行额外业务逻辑
    if (
      (processedResult.intent === 'todo' ||
        processedResult.intent === 'reminder') &&
      processedResult.data
    ) {
      // 当意图是todo或reminder时，都保存到待办事项
      // 因为从用户语义上来说，设置提醒和创建待办事项是类似的需求
      const todoData = processedResult.data;
      const message = await this.todoService.create({
        title: todoData.title,
        content: todoData.content,
        type: todoData.type || 'work',
        priority: todoData.priority || 'medium',
        todoTime: todoData.todoTime,
        isUrgent: todoData.isUrgent || false,
        creator: userInfo.name,
        originInput: sendMessageDto.input,
        originOutput: processedResult.output,
      });

      // 安排提醒邮件（同步发送应用内通知）
      await this.scheduleService.scheduleOneTimeEmail(
        message.id,
        todoData.todoTime,
        userInfo.email,
        '待办事项提醒: ' + todoData.title,
        `您有一条待办事项：${todoData.content}`,
        userInfo.id,
      );

      return ResOp.success({
        output: processedResult.output,
        messageId: message.id,
        intent: processedResult.intent,
      });
    }

    // deepdive 意图：把用户问题和 AI 回答持久化到 DB（独立 sessionId）
    if (
      processedResult.intent === 'deepdive' &&
      sendMessageDto.deepDiveSessionId
    ) {
      const sessionId = `deepdive:${sendMessageDto.deepDiveSessionId}`;
      const now = new Date().toISOString();
      await Promise.all([
        this.chatHistoryService.create({
          content: sendMessageDto.input,
          role: 'local',
          date: now,
          sessionId,
          userId: req.user.userId,
        }),
        this.chatHistoryService.create({
          content: processedResult.output,
          role: 'ai',
          date: now,
          sessionId,
          userId: req.user.userId,
        }),
      ]);
    }

    // 对于其他意图，直接返回结果
    return ResOp.success({
      output: processedResult.output,
      intent: processedResult.intent,
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
    const userInfo = {
      id: req.user.userId,
      name: req.user.name,
      email: req.user.email,
      age: req.user.age,
      gender: req.user.gender,
      hobby: req.user.hobby,
    };

    const inputData: InputData = {
      input: sendMessageDto.input,
      userInfo: userInfo as any,
      userId: req.user.userId,
      location: sendMessageDto.location,
      forceIntent: sendMessageDto.mode,
      context: sendMessageDto.context,
      deepDiveSessionId: sendMessageDto.deepDiveSessionId,
    };

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
          const payload: Record<string, unknown> = {
            output: ev.output,
            intent: ev.intent,
            data: ev.data,
          };

          if (
            (ev.intent === 'todo' || ev.intent === 'reminder') &&
            ev.data
          ) {
            const todoData = ev.data as {
              title: string;
              content: string;
              type?: string;
              priority?: string;
              todoTime?: string;
              isUrgent?: boolean;
            };
            const message = await this.todoService.create({
              title: todoData.title,
              content: todoData.content,
              type: todoData.type || 'work',
              priority: todoData.priority || 'medium',
              todoTime: todoData.todoTime,
              isUrgent: todoData.isUrgent || false,
              creator: userInfo.name,
              originInput: sendMessageDto.input,
              originOutput: ev.output,
            });

            await this.scheduleService.scheduleOneTimeEmail(
              message.id,
              todoData.todoTime,
              userInfo.email,
              '待办事项提醒: ' + todoData.title,
              `您有一条待办事项：${todoData.content}`,
              userInfo.id,
            );

            payload.messageId = message.id;
          }

          if (
            ev.intent === 'deepdive' &&
            sendMessageDto.deepDiveSessionId
          ) {
            const sessionId = `deepdive:${sendMessageDto.deepDiveSessionId}`;
            const now = new Date().toISOString();
            await Promise.all([
              this.chatHistoryService.create({
                content: sendMessageDto.input,
                role: 'local',
                date: now,
                sessionId,
                userId: req.user.userId,
              }),
              this.chatHistoryService.create({
                content: ev.output,
                role: 'ai',
                date: now,
                sessionId,
                userId: req.user.userId,
              }),
            ]);
          }

          writeSse('done', payload);
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

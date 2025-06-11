import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';

import { AiService } from './ai.service';

import { SendMessageDto } from './dto/send-message.dto';

import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { ResOp } from '@/common/model/response.model';
import { TodoService } from '../todo/todo.service';

@ApiTags('AI接口')
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly todoService: TodoService, // 新增依赖注入
  ) {}

  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '发送消息', description: '向AI发送消息并获取回复' })
  @ApiBody({ type: SendMessageDto })
  @Post('message')
  async sendMessage(@Body() sendMessageDto: SendMessageDto) {
    const { structured: result } = await this.aiService.process(
      sendMessageDto.input,
    );
    console.log(result);

    // 保存到待办事项
    await this.todoService.create({
      title: result.title,
      content: result.content,
      type: result.type,
      priority: result.priority,
      todoTime: result.todoTime,
      isUrgent: result.isUrgent,
    });
    return ResOp.success(result.originOutput);
  }
}

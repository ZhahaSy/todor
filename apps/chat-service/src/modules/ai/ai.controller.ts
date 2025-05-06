import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';

import { AiService } from './ai.service';

import { SendMessageDto } from './dto/send-message.dto';

import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { ResOp } from '@/common/model/response.model';

@ApiTags('AI接口')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '发送消息', description: '向AI发送消息并获取回复' })
  @ApiBody({ type: SendMessageDto })
  @Post('message')
  async sendMessage(@Body() sendMessageDto: SendMessageDto) {
    return ResOp.success(
      await this.aiService.sendMessage(sendMessageDto.input),
    );
  }
}

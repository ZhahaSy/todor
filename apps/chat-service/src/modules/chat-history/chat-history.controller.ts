import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guard/jwt.auth';
import { ChatHistoryService } from './chat-history.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { ResOp } from '@/common/model/response.model';

@UseGuards(JwtAuthGuard)
@Controller('chat-history')
export class ChatHistoryController {
  constructor(private readonly chatService: ChatHistoryService) {}

  @Post()
  async create(@Body() createChatDto: CreateChatDto) {
    console.log('createChatDto', createChatDto);

    return ResOp.success(await this.chatService.create(createChatDto));
  }

  @Get()
  async findAll() {
    return ResOp.success(await this.chatService.findAll());
  }
}

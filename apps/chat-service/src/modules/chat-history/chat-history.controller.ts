import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guard/jwt.auth';
import { ChatHistoryService } from './chat-history.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { ResOp } from '@/common/model/response.model';
import { UserService } from '../user/user.service';

@UseGuards(JwtAuthGuard)
@Controller('chat-history')
export class ChatHistoryController {
  constructor(
    private readonly chatService: ChatHistoryService,
    private readonly userService: UserService,
  ) {}

  @Post()
  async create(@Body() createChatDto: CreateChatDto, @Request() req) {
    // 直接从 JWT payload 中获取用户名，避免数据库查询
    const name = req.user.name;
    const res = await this.chatService.create({
      ...createChatDto,
      sessionId: name,
    });
    return ResOp.success(res);
  }

  @Get()
  async findAll(@Request() req) {
    // 直接从 JWT payload 中获取用户名，避免数据库查询
    const name = req.user.name;
    const data = await this.chatService.findAll({ sessionId: name });
    return ResOp.success(data);
  }
}

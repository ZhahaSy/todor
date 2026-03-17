import {
  Controller,
  Post,
  Get,
  Body,
  Query,
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
  async findAll(
    @Request() req,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('sessionId') sessionId?: string,
  ) {
    // 若前端传了 sessionId（深入模式），直接使用；否则使用用户名（主对话）
    const resolvedSessionId = sessionId ?? req.user.name;
    const data = await this.chatService.findAll({
      sessionId: resolvedSessionId,
      limit: limit ? parseInt(limit, 10) : 10,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    return ResOp.success(data);
  }
}

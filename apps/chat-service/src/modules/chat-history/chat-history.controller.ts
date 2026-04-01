import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guard/jwt.auth';
import { ChatHistoryService } from './chat-history.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpsertDeepDiveExtraDto } from './dto/deep-dive-extra.dto';
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
    const { name, userId } = req.user;
    const resolvedSessionId = createChatDto.sessionId ?? name;
    const res = await this.chatService.create({
      ...createChatDto,
      sessionId: resolvedSessionId,
      userId,
    });
    return ResOp.success(res);
  }

  @Get('sessions')
  async findSessions(@Request() req) {
    const { name, userId } = req.user;
    const sessions = await this.chatService.findSessions(userId, name);
    return ResOp.success(sessions);
  }

  @Get('deep-dive/extra')
  async getDeepDiveExtra(
    @Request() req,
    @Query('sessionId') sessionId: string,
  ) {
    const { userId } = req.user;
    if (!sessionId?.trim()) {
      return ResOp.success({ extraContext: '' });
    }
    const data = await this.chatService.getDeepDiveExtra(userId, sessionId);
    return ResOp.success(data);
  }

  @Put('deep-dive/extra')
  async upsertDeepDiveExtra(
    @Body() dto: UpsertDeepDiveExtraDto,
    @Request() req,
  ) {
    const { userId } = req.user;
    await this.chatService.upsertDeepDiveExtra(
      userId,
      dto.sessionId,
      dto.extraContext ?? '',
    );
    return ResOp.success(null);
  }

  @Delete('deep-dive/session')
  async deleteDeepDiveSession(
    @Request() req,
    @Query('sessionId') sessionId: string,
  ) {
    const { userId } = req.user;
    if (!sessionId?.trim()) {
      return ResOp.success(null);
    }
    await this.chatService.deleteDeepDiveSession(userId, sessionId);
    return ResOp.success(null);
  }

  @Get()
  async findAll(
    @Request() req,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('sessionId') sessionId?: string,
  ) {
    const { name, userId } = req.user;
    const resolvedSessionId = sessionId ?? name;
    const data = await this.chatService.findAll({
      sessionId: resolvedSessionId,
      userId,
      limit: limit ? parseInt(limit, 10) : 10,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    return ResOp.success(data);
  }
}

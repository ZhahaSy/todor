import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';

import { AiService, InputData, ProcessedResult } from './ai.service';

import { SendMessageDto } from './dto/send-message.dto';

import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { ResOp } from '@/common/model/response.model';
import { TodoService } from '../todo/todo.service';
import { JwtAuthGuard } from '@/common/guard/jwt.auth';
import { UserService } from '../user/user.service';
import { AdvancedSchedulerService } from '../schedule/advanced-scheduler.service';

@ApiTags('AI接口')
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly todoService: TodoService,
    private readonly userService: UserService,
    private readonly scheduleService: AdvancedSchedulerService,
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

    // 构建输入数据
    const inputData: InputData = {
      input: sendMessageDto.input,
      userInfo: userInfo as any, // 将简化的用户信息传递给 AI 服务
    };

    // 调用AI服务处理消息（内部已包含意图识别和处理）
    const processedResult: ProcessedResult =
      await this.aiService.process(inputData);

    // 根据意图执行额外业务逻辑
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

      // 安排提醒邮件
      await this.scheduleService.scheduleOneTimeEmail(
        new Date().toISOString(),
        new Date(todoData.todoTime), // 东八区时间
        userInfo.email,
        '待办事项提醒: ' + todoData.title,
        `您有一条待办事项：${todoData.content}`,
      );

      return ResOp.success({
        output: processedResult.output,
        messageId: message.id,
        intent: processedResult.intent,
      });
    }

    // 对于其他意图，直接返回结果
    return ResOp.success({
      output: processedResult.output,
      intent: processedResult.intent,
    });
  }
}

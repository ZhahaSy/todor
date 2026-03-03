import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiModelProvider } from './ai-model.provider';
import { ChatIntentHandler } from './intent-handlers/chat.intent-handler';
import { TodoIntentHandler } from './intent-handlers/todo.intent-handler';
import { AiController } from './ai.controller';
import { ScheduleModule } from '../schedule/schedule.module';
import { TodoModule } from '../todo/todo.module';
import { UserModule } from '../user/user.module';
import { RedisModule } from '../redis/redis.module';
import { MessageModule } from '../message/message.module';
import { DatabaseQueryTool } from './tools/database-query.tool';
import { SendEmailTool } from './tools/send-email.tool';
import { CreateReminderTool } from './tools/create-reminder.tool';
import { WeatherQueryTool } from './tools/weather-query.tool';

@Module({
  imports: [TodoModule, UserModule, ScheduleModule, RedisModule, MessageModule],
  controllers: [AiController],
  providers: [
    AiModelProvider,
    AiService,
    ChatIntentHandler,
    TodoIntentHandler,
    DatabaseQueryTool,
    SendEmailTool, // 保留 provider，待邮件功能改造后重新注册
    CreateReminderTool,
    WeatherQueryTool,
  ],
  exports: [AiService, AiModelProvider],
})
export class AiModule {
  constructor(
    aiService: AiService,
    chatIntentHandler: ChatIntentHandler,
    todoIntentHandler: TodoIntentHandler,
    databaseQueryTool: DatabaseQueryTool,
    createReminderTool: CreateReminderTool,
    weatherQueryTool: WeatherQueryTool,
  ) {
    // 注册意图处理器
    aiService.registerIntentHandler(chatIntentHandler);
    aiService.registerIntentHandler(todoIntentHandler);

    // 注册 LangChain Tools
    (aiService as any).registerTool(databaseQueryTool);
    // SendEmailTool 暂时下线，待改造：通讯录、对话确认、自定义发件人
    (aiService as any).registerTool(createReminderTool);
    (aiService as any).registerTool(weatherQueryTool);
  }
}

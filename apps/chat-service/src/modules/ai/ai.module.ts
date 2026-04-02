import { Module, forwardRef } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiModelProvider } from './ai-model.provider';
import { ChatIntentHandler } from './intent-handlers/chat.intent-handler';
import { TodoIntentHandler } from './intent-handlers/todo.intent-handler';
import { DeepDiveIntentHandler } from './intent-handlers/deepdive.intent-handler';
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
import { SkillModule } from '../skill/skill.module';
import { ChatHistoryModule } from '../chat-history/chat-history.module';

@Module({
  imports: [TodoModule, UserModule, ScheduleModule, RedisModule, MessageModule, ChatHistoryModule, forwardRef(() => SkillModule)],
  controllers: [AiController],
  providers: [
    AiModelProvider,
    AiService,
    ChatIntentHandler,
    TodoIntentHandler,
    DeepDiveIntentHandler,
    DatabaseQueryTool,
    SendEmailTool, // 保留 provider，待邮件功能改造后重新注册
    CreateReminderTool,
    WeatherQueryTool,
  ],
  exports: [AiService, AiModelProvider],
})
export class AiModule {}

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

@Module({
  imports: [TodoModule, UserModule, ScheduleModule, RedisModule],
  controllers: [AiController],
  providers: [
    AiModelProvider,
    AiService,
    ChatIntentHandler,
    TodoIntentHandler,
    // 在这里注册新的意图处理器
  ],
  exports: [AiService, AiModelProvider],
})
export class AiModule {
  constructor(
    private aiService: AiService,
    private chatIntentHandler: ChatIntentHandler,
    private todoIntentHandler: TodoIntentHandler,
  ) {
    // 注册意图处理器
    aiService.registerIntentHandler(chatIntentHandler);
    aiService.registerIntentHandler(todoIntentHandler);
  }
}

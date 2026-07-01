import { Module, forwardRef } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiModelProvider } from './ai-model.provider';
import { AiQuotaService } from './ai-quota.service';
import { AgentChatService } from './agent-chat.service';
import { DeepDiveIntentHandler } from './intent-handlers/deepdive.intent-handler';
import { AiController } from './ai.controller';
import { AiQuotaController } from './ai-quota.controller';
import { AdminGuard } from '@/common/guard/admin.guard';
import { ScheduleModule } from '../schedule/schedule.module';
import { TodoModule } from '../todo/todo.module';
import { UserModule } from '../user/user.module';
import { RedisModule } from '../redis/redis.module';
import { MessageModule } from '../message/message.module';
import { DatabaseQueryTool } from './tools/database-query.tool';
import { CreateReminderTool } from './tools/create-reminder.tool';
import { WeatherQueryTool } from './tools/weather-query.tool';
import { SkillModule } from '../skill/skill.module';
import { ChatHistoryModule } from '../chat-history/chat-history.module';
import { MemoryModule } from '../memory/memory.module';
import {
  SaveMemoryTool,
  RecallMemoryTool,
  DeleteMemoryTool,
} from './tools/memory.tools';
import { MemoryExtractorService } from '../memory/memory-extractor.service';

@Module({
  imports: [
    TodoModule,
    UserModule,
    ScheduleModule,
    RedisModule,
    MessageModule,
    ChatHistoryModule,
    MemoryModule,
    forwardRef(() => SkillModule),
  ],
  controllers: [AiController, AiQuotaController],
  providers: [
    AiModelProvider,
    AiService,
    AiQuotaService,
    AdminGuard,
    AgentChatService,
    DeepDiveIntentHandler,
    DatabaseQueryTool,
    CreateReminderTool,
    WeatherQueryTool,
    SaveMemoryTool,
    RecallMemoryTool,
    DeleteMemoryTool,
    MemoryExtractorService,
  ],
  exports: [AiService, AiModelProvider],
})
export class AiModule {}

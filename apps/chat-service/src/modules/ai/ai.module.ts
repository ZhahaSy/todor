import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { TodoModule } from '../todo/todo.module';
import { UserModule } from '../user/user.module';
import { ScheduleModule } from '../schedule/schedule.module';

@Module({
  imports: [TodoModule, UserModule, ScheduleModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}

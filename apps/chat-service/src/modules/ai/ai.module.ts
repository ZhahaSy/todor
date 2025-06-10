import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { TodoModule } from '../todo/todo.module';

@Module({
  imports: [TodoModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}

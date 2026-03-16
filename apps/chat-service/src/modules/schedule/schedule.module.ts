import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdvancedSchedulerService } from './advanced-scheduler.service';
import { MessageModule } from '../message/message.module';
import { ScheduledTask } from './entities/scheduled-task.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ScheduledTask]),
    forwardRef(() => MessageModule),
  ],
  providers: [AdvancedSchedulerService],
  exports: [AdvancedSchedulerService],
})
export class ScheduleModule {}

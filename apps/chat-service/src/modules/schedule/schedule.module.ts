import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdvancedSchedulerService } from './advanced-scheduler.service';
import { EmailService } from '../message/email.service';
import { ScheduledTask } from './entities/scheduled-task.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ScheduledTask])],
  providers: [AdvancedSchedulerService, EmailService],
  exports: [AdvancedSchedulerService],
})
export class ScheduleModule {}

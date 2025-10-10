import { Module } from '@nestjs/common';
import { AdvancedSchedulerService } from './advanced-scheduler.service';

import { EmailService } from '../message/email.service';
@Module({
  providers: [AdvancedSchedulerService, EmailService],
  exports: [AdvancedSchedulerService],
})
export class ScheduleModule {}

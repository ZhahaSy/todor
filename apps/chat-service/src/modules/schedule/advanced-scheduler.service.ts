import { Injectable } from '@nestjs/common';
import * as schedule from 'node-schedule';
import { EmailService } from '../message/email.service';

@Injectable()
export class AdvancedSchedulerService {
  private jobs: Map<string, schedule.Job> = new Map();

  constructor(private readonly mailService: EmailService) {}

  // 使用具体日期时间安排任务
  scheduleOneTimeEmail(
    taskId: string,
    targetDate: Date,
    to: string,
    subject: string,
    content: string,
  ) {
    const job = schedule.scheduleJob(targetDate, async () => {
      try {
        console.log(`Executing one-time email task: ${taskId}`);
        await this.mailService.sendMail(to, subject, content);
        console.log(`One-time email sent successfully: ${taskId}`);

        // 任务完成后从 Map 中移除
        this.jobs.delete(taskId);
      } catch (error) {
        console.error(`Failed to send one-time email ${taskId}:`, error);
      }
    });

    this.jobs.set(taskId, job);
    console.log(`Scheduled one-time email task: ${taskId}`);
    return {
      taskId,
      scheduledTime: targetDate,
      status: 'scheduled',
      message: `邮件已安排于 ${targetDate} 发送`,
    };
  }

  // 取消已安排的任务
  cancelScheduledTask(taskId: string) {
    const job = this.jobs.get(taskId);
    if (job) {
      job.cancel();
      this.jobs.delete(taskId);
      console.log(`Scheduled task canceled: ${taskId}`);
      return true;
    }
    return false;
  }

  // 获取所有待执行的任务
  getPendingTasks() {
    return Array.from(this.jobs.keys());
  }
}

import { Injectable, Logger } from '@nestjs/common';
import * as schedule from 'node-schedule';
import { EmailService } from '../message/email.service';

interface FailedEmailTask {
  taskId: string;
  to: string;
  subject: string;
  content: string;
  failedAt: Date;
  error: string;
  attempts: number;
}

@Injectable()
export class AdvancedSchedulerService {
  private readonly logger = new Logger(AdvancedSchedulerService.name);
  private jobs: Map<string, schedule.Job> = new Map();
  private deadLetterQueue: FailedEmailTask[] = [];

  // 重试配置
  private readonly maxRetries = 3;
  private readonly retryDelay = 5000; // 5秒

  constructor(private readonly mailService: EmailService) {}

  /**
   * 安排一次性邮件发送任务（带重试机制）
   */
  scheduleOneTimeEmail(
    taskId: string,
    targetDate: Date,
    to: string,
    subject: string,
    content: string,
  ) {
    const job = schedule.scheduleJob(targetDate, async () => {
      await this.sendEmailWithRetry(taskId, to, subject, content);
    });

    this.jobs.set(taskId, job);
    this.logger.log(
      `📅 已安排邮件任务 [${taskId}] - 发送时间: ${targetDate.toLocaleString()}`,
    );
    return {
      taskId,
      scheduledTime: targetDate,
      status: 'scheduled',
      message: `邮件已安排于 ${targetDate} 发送`,
    };
  }

  /**
   * 带重试机制的邮件发送
   */
  private async sendEmailWithRetry(
    taskId: string,
    to: string,
    subject: string,
    content: string,
  ): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        this.logger.log(
          `📧 发送邮件 [${taskId}] - 尝试 ${attempt}/${this.maxRetries}`,
        );

        await this.mailService.sendMail(to, subject, content);

        this.logger.log(`✅ 邮件发送成功 [${taskId}]`);

        // 成功后移除任务
        this.jobs.delete(taskId);
        return;
      } catch (error) {
        lastError = error;

        this.logger.warn(
          `⚠️ 邮件发送失败 [${taskId}] - 尝试 ${attempt}/${this.maxRetries}: ${error.message}`,
        );

        // 如果不是最后一次尝试，等待后重试
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * attempt; // 指数退避
          this.logger.debug(`等待 ${delay}ms 后重试...`);
          await this.delay(delay);
        }
      }
    }

    // 所有重试都失败，保存到死信队列
    this.logger.error(
      `❌ 邮件发送最终失败 [${taskId}] - 已保存到死信队列`,
      lastError.stack,
    );

    await this.saveToDLQ({
      taskId,
      to,
      subject,
      content,
      failedAt: new Date(),
      error: lastError.message,
      attempts: this.maxRetries,
    });

    // 清理任务
    this.jobs.delete(taskId);
  }

  /**
   * 保存到死信队列
   */
  private async saveToDLQ(failedTask: FailedEmailTask): Promise<void> {
    this.deadLetterQueue.push(failedTask);

    this.logger.error(
      `💀 死信队列记录: ${JSON.stringify({
        taskId: failedTask.taskId,
        to: failedTask.to,
        subject: failedTask.subject,
        failedAt: failedTask.failedAt.toISOString(),
        error: failedTask.error,
      })}`,
    );

    // TODO: 可以在这里将失败任务持久化到数据库
    // await this.todoRepository.update(failedTask.taskId, {
    //   reminderStatus: 'failed',
    //   reminderError: failedTask.error
    // });
  }

  /**
   * 获取死信队列
   */
  getDeadLetterQueue(): FailedEmailTask[] {
    return [...this.deadLetterQueue];
  }

  /**
   * 重新尝试死信队列中的任务
   */
  async retryDeadLetterTask(taskId: string): Promise<boolean> {
    const taskIndex = this.deadLetterQueue.findIndex(
      (task) => task.taskId === taskId,
    );

    if (taskIndex === -1) {
      this.logger.warn(`未找到死信任务: ${taskId}`);
      return false;
    }

    const task = this.deadLetterQueue[taskIndex];
    this.logger.log(`🔄 重试死信任务 [${taskId}]`);

    try {
      await this.mailService.sendMail(task.to, task.subject, task.content);
      this.logger.log(`✅ 死信任务重试成功 [${taskId}]`);

      // 从死信队列中移除
      this.deadLetterQueue.splice(taskIndex, 1);
      return true;
    } catch (error) {
      this.logger.error(`❌ 死信任务重试失败 [${taskId}]: ${error.message}`);
      return false;
    }
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 取消已安排的任务
   */
  cancelScheduledTask(taskId: string): boolean {
    const job = this.jobs.get(taskId);
    if (job) {
      job.cancel();
      this.jobs.delete(taskId);
      this.logger.log(`🚫 已取消任务: ${taskId}`);
      return true;
    }
    this.logger.warn(`未找到任务: ${taskId}`);
    return false;
  }

  /**
   * 获取所有待执行的任务
   */
  getPendingTasks(): string[] {
    return Array.from(this.jobs.keys());
  }

  /**
   * 获取任务统计信息
   */
  getStats() {
    return {
      pendingTasks: this.jobs.size,
      deadLetterQueueSize: this.deadLetterQueue.length,
      totalFailed: this.deadLetterQueue.length,
    };
  }
}

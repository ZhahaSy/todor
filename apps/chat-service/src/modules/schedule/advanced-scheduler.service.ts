import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as schedule from 'node-schedule';
import { parseScheduleAt } from '@/common/utils/parse-schedule-time';
import { EmailService } from '../message/email.service';
import { ScheduledTask } from './entities/scheduled-task.entity';

@Injectable()
export class AdvancedSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(AdvancedSchedulerService.name);
  private jobs: Map<string, schedule.Job> = new Map();

  private readonly maxRetries = 3;
  private readonly retryDelay = 5000; // 5秒基础延迟，指数退避

  constructor(
    private readonly mailService: EmailService,
    @InjectRepository(ScheduledTask)
    private readonly taskRepository: Repository<ScheduledTask>,
  ) {}

  /**
   * 应用启动时从数据库恢复所有待执行任务
   */
  async onModuleInit() {
    const pendingTasks = await this.taskRepository.find({
      where: { status: 'pending' },
    });

    this.logger.log(`🔄 恢复 ${pendingTasks.length} 个待执行任务`);

    for (const task of pendingTasks) {
      const targetDate = new Date(Number(task.scheduledAt));
      if (targetDate > new Date()) {
        this.scheduleJob(
          task.taskId,
          targetDate,
          task.to,
          task.subject,
          task.content,
          task.userId,
        );
      } else {
        // 时间已过（服务重启期间错过），立即补发
        this.logger.warn(`⚠️ 任务 [${task.taskId}] 调度时间已过，立即补发`);
        void this.sendEmailWithRetry(
          task.taskId,
          task.to,
          task.subject,
          task.content,
          task.userId,
        );
      }
    }
  }

  /**
   * 安排一次性邮件发送任务（带应用内通知）
   */
  async scheduleOneTimeEmail(
    taskId: string,
    targetAt: string | Date,
    to: string,
    subject: string,
    content: string,
    userId?: string,
  ) {
    let targetDate: Date;
    try {
      targetDate = parseScheduleAt(targetAt);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '提醒时间无效';
      throw new BadRequestException(msg);
    }

    if (targetDate <= new Date()) {
      this.logger.warn(`⚠️ 任务 [${taskId}] 调度时间已过，跳过`);
      return { taskId, status: 'skipped', message: '调度时间已过' };
    }

    // 持久化到数据库，重启后可恢复
    await this.taskRepository.save({
      taskId,
      userId,
      to,
      subject,
      content,
      scheduledAt: targetDate.getTime(),
      status: 'pending',
      attempts: 0,
      failedReason: '',
    });

    this.scheduleJob(taskId, targetDate, to, subject, content, userId);

    this.logger.log(
      `📅 已安排邮件任务 [${taskId}] - 发送时间(ISO): ${targetDate.toISOString()} | 本地: ${targetDate.toString()} | TZ: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`,
    );

    return {
      taskId,
      scheduledTime: targetDate,
      status: 'scheduled',
      message: `邮件已安排于 ${targetDate} 发送`,
    };
  }

  /**
   * 注册 node-schedule 任务（内存中）
   */
  private scheduleJob(
    taskId: string,
    targetDate: Date,
    to: string,
    subject: string,
    content: string,
    userId?: string,
  ) {
    const job = schedule.scheduleJob(targetDate, async () => {
      await this.sendEmailWithRetry(taskId, to, subject, content, userId);
    });
    this.jobs.set(taskId, job);
  }

  /**
   * 带指数退避重试的邮件发送（同步发送应用内通知）
   */
  private async sendEmailWithRetry(
    taskId: string,
    to: string,
    subject: string,
    content: string,
    userId?: string,
  ): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        this.logger.log(
          `📧 发送邮件 [${taskId}] - 尝试 ${attempt}/${this.maxRetries}`,
        );

        // 使用 sendMailWithNotification 同步发送邮件和应用内通知
        await this.mailService.sendMailWithNotification(to, subject, content, userId);

        this.logger.log(`✅ 邮件发送成功 [${taskId}]`);
        this.jobs.delete(taskId);
        await this.taskRepository.update(
          { taskId },
          { status: 'sent', attempts: attempt },
        );
        return;
      } catch (error) {
        lastError = error;

        this.logger.warn(
          `⚠️ 邮件发送失败 [${taskId}] - 尝试 ${attempt}/${this.maxRetries}: ${error.message}`,
        );

        if (attempt < this.maxRetries) {
          // 指数退避：5s, 10s, 20s
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          this.logger.debug(`等待 ${delay}ms 后重试...`);
          await this.delay(delay);
        }
      }
    }

    // 所有重试均失败，写入数据库死信记录
    this.logger.error(
      `❌ 邮件发送最终失败 [${taskId}] - 已标记为 failed`,
      lastError.stack,
    );
    this.jobs.delete(taskId);
    await this.taskRepository.update(
      { taskId },
      {
        status: 'failed',
        attempts: this.maxRetries,
        failedReason: lastError.message,
      },
    );
  }

  /**
   * 获取死信队列（status = failed 的持久化记录）
   */
  async getDeadLetterQueue(): Promise<ScheduledTask[]> {
    return this.taskRepository.find({ where: { status: 'failed' } });
  }

  /**
   * 重新尝试死信任务（带完整重试逻辑）
   */
  async retryDeadLetterTask(taskId: string): Promise<boolean> {
    const task = await this.taskRepository.findOne({
      where: { taskId, status: 'failed' },
    });

    if (!task) {
      this.logger.warn(`未找到死信任务: ${taskId}`);
      return false;
    }

    this.logger.log(`🔄 重试死信任务 [${taskId}]`);

    // 先重置状态为 pending，再走完整重试流程
    await this.taskRepository.update(
      { taskId },
      { status: 'pending', failedReason: '' },
    );
    await this.sendEmailWithRetry(taskId, task.to, task.subject, task.content, task.userId);

    const updated = await this.taskRepository.findOne({ where: { taskId } });
    return updated?.status === 'sent';
  }

  /**
   * 取消已安排的任务
   */
  async cancelScheduledTask(taskId: string): Promise<boolean> {
    const job = this.jobs.get(taskId);
    if (job) {
      job.cancel();
      this.jobs.delete(taskId);
      await this.taskRepository.update({ taskId }, { status: 'cancelled' });
      this.logger.log(`🚫 已取消任务: ${taskId}`);
      return true;
    }
    this.logger.warn(`未找到内存任务: ${taskId}`);
    return false;
  }

  /**
   * 获取所有内存中待执行的任务 ID
   */
  getPendingTasks(): string[] {
    return Array.from(this.jobs.keys());
  }

  /**
   * 获取统计信息
   */
  async getStats() {
    const failedCount = await this.taskRepository.count({
      where: { status: 'failed' },
    });
    return {
      pendingTasks: this.jobs.size,
      deadLetterQueueSize: failedCount,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

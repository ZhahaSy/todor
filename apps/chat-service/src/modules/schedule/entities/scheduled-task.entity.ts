import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('scheduled_task')
export class ScheduledTask {
  @PrimaryColumn({ comment: '任务ID（与 todo.id 对应）' })
  taskId: string;

  @Column({ comment: '用户ID（用于发送应用内通知）', nullable: true })
  userId: string;

  @Column({ comment: '收件人邮箱' })
  to: string;

  @Column({ comment: '邮件主题' })
  subject: string;

  @Column({ type: 'text', comment: '邮件内容' })
  content: string;

  @Column({ type: 'bigint', comment: '计划发送时间（时间戳 ms）' })
  scheduledAt: number;

  @Column({
    default: 'pending',
    comment: '状态: pending | sent | failed | cancelled',
  })
  status: string;

  @Column({ default: 0, comment: '已尝试次数' })
  attempts: number;

  @Column({ type: 'text', nullable: true, comment: '失败原因' })
  failedReason: string | null;
}

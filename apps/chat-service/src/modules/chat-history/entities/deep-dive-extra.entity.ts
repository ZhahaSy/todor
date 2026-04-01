import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

/** 深入模式「追加」上下文，按用户 + 会话隔离 */
@Entity('deep_dive_extra')
@Unique(['userId', 'sessionId'])
export class DeepDiveExtra {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', comment: '用户 ID' })
  userId: string;

  /** 与前端 URL ?session= 一致的 UUID（不含 deepdive: 前缀） */
  @Index()
  @Column({ type: 'varchar', length: 128, comment: '深入会话 ID' })
  sessionId: string;

  @Column({ type: 'text', default: '', comment: '追加给模型的额外文本' })
  extraContext: string;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date;
}

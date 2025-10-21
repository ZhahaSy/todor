import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class ChatHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ comment: '消息内容' })
  content: string;

  @Column({
    type: 'varchar',
    comment: '发送者角色',
    enum: ['local', 'ai'], // 保留枚举校验
  })
  role: string;

  @CreateDateColumn({ type: 'bigint', comment: '时间戳' })
  date: number;

  @Column({
    type: 'varchar',
    comment: '会话ID',
    default: null,
  })
  sessionId: string | null;
}

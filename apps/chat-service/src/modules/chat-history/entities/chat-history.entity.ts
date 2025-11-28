import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

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

  @Column({ type: 'varchar', comment: '日期' })
  date: string;

  @Column({
    type: 'varchar',
    comment: '会话ID',
    default: null,
  })
  sessionId: string | null;
}

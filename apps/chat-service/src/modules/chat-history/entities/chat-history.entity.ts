import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

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

  @Index()
  @Column({ type: 'varchar', comment: '所属用户ID', default: null, nullable: true })
  userId: string | null;

  @Index() // 添加索引：按会话ID查询聊天历史
  @Column({
    type: 'varchar',
    comment: '会话ID',
    default: null,
  })
  sessionId: string | null;

  @Index() // 添加索引：通过todoId关联查询
  @Column({
    type: 'varchar',
    comment: '关联的todo项ID',
    default: null,
  })
  todoId: string | null;

  @Column({
    type: 'varchar',
    comment: '深入会话标题（首条用户消息截取）',
    default: null,
    nullable: true,
  })
  title: string | null;
}

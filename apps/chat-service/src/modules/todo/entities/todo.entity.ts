import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class Todo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ comment: 'todo标题' })
  title: string | null;

  @Column({ type: 'varchar', comment: 'todo内容' })
  content: string | null;

  @Column({
    type: 'varchar',
    comment: '原始输入',
    default: null,
  })
  originInput: string | null;

  @Column({
    type: 'varchar',
    comment: '原始输出',
    default: null,
  })
  originOutput: string | null;

  @Column({
    type: 'varchar',
    comment: 'todo 类型',
    enum: ['work', 'life', 'study'], // 保留枚举校验
    default: 'work',
  })
  type: string;

  @Column({
    type: 'varchar',
    comment: 'todo 优先级',
    enum: ['low', 'medium', 'high'], // 保留枚举校验
    default: 'medium',
  })
  priority: string;

  @Column({
    type: 'boolean',
    comment: '是否紧急',
    default: false,
  })
  isUrgent: boolean;

  @Column({
    type: 'varchar',
    comment: 'todo 状态',
    enum: ['active', 'completed'], // 保留枚举校验
    default: 'active',
  })
  status: string;

  @Column({
    type: 'bigint',
    comment: 'todo 时间',
    default: () => {
      return Date.now();
    },
  })
  todoTime: string;

  @CreateDateColumn({
    type: 'bigint',
    comment: 'create time',
    default: () => {
      return Date.now();
    },
  })
  createTime: number;

  @Column({
    type: 'boolean',
    comment: '是否删除',
    default: false,
  })
  isDeleted: boolean;
}

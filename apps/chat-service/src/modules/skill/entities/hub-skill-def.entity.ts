import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('hub_skill_def')
export class HubSkillDef {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string; // snake_case，全局唯一

  @Column()
  displayName: string;

  @Column('text')
  description: string;

  @Column()
  category: string; // 工具/资讯/文案/生活/开发

  @Column({ type: 'text', default: '[]' })
  tags: string; // JSON string[]

  @Column({ type: 'text', default: '[]' })
  triggerKeywords: string;

  @Column('text')
  config: string; // JSON: { url, method }

  @Column({ type: 'text', default: '{}' })
  inputSchema: string;

  @CreateDateColumn()
  createdAt: Date;
}

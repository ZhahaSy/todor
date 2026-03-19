import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('skill')
export class Skill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // snake_case，作为 tool.name（同一用户唯一）

  @Column()
  displayName: string;

  @Column('text')
  description: string; // LLM 靠此决定是否调用

  @Column({ type: 'text', default: '[]' })
  triggerKeywords: string; // JSON string[]，预留给意图 prompt

  @Column({ default: 'webhook' })
  type: 'webhook' | 'flow';

  @Column({ default: 'single' })
  executionType: 'single' | 'flow';

  @Column('text')
  config: string; // JSON: { url, method?, headers?, timeout? }

  @Column({ type: 'text', default: '{}' })
  inputSchema: string; // JSON Schema

  @Column({ default: true })
  enabled: boolean;

  @Column({ default: false })
  isHubSkill: boolean;

  @Column({ nullable: true, type: 'text' })
  hubSkillId: string | null;

  @Column()
  creatorId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

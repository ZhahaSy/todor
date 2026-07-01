import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';

/**
 * 长期记忆：跨会话持久的、关于用户的事实。
 *
 * 与短期对话记忆（Redis）、结构化档案（User 实体）严格区分 —— 见
 * docs/long-term-memory-design.md。半结构化设计：自由 content + 受控元数据。
 * 第一期只支持"用户显式写入/召回/删除"，评分与自动抽取留第二期。
 */
@Entity()
export class UserMemory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index() // 按用户隔离记忆（权威归属，鉴权依据）
  @Column({ type: 'varchar', comment: '归属用户ID' })
  userId: string;

  @Column({ type: 'text', comment: '记忆正文（自由文本）' })
  content: string;

  @Index() // 召回时按分类过滤
  @Column({
    type: 'varchar',
    comment: '分类：health/preference/relationship/goal/profile_extra/other',
    default: 'other',
  })
  category: string;

  @Column({
    type: 'varchar',
    comment: '记忆主体：self / 关系人或宠物名（如"父亲"、"猫:咪"）',
    default: 'self',
  })
  subject: string;

  @Column({
    type: 'varchar',
    comment: '确信度：stated 用户明说 / inferred 模型推测',
    default: 'stated',
  })
  confidence: string;

  @Column({
    type: 'varchar',
    comment: '敏感度：normal / sensitive（健康/财务/隐私）',
    default: 'normal',
  })
  sensitivity: string;

  @Column({
    type: 'varchar',
    comment: '时效：permanent 永久属性 / temporal 有时限状态',
    default: 'permanent',
  })
  temporality: string;

  @Column({
    type: 'varchar',
    comment: '软性失效线索（如"考研后"、"2025-12"），不硬删',
    nullable: true,
    default: null,
  })
  expiresHint: string | null;

  @Column({
    type: 'text',
    comment: '来源原话（召回时连证据给模型，可追溯）',
    nullable: true,
    default: null,
  })
  source: string | null;

  @Index() // 召回只取 active
  @Column({
    type: 'varchar',
    comment: '状态：active 活跃 / superseded 被取代 / deleted 用户删除',
    default: 'active',
  })
  status: string;

  @Column({
    type: 'varchar',
    comment: '被哪条记忆取代（冲突更新链路，第三期用）',
    nullable: true,
    default: null,
  })
  supersededBy: string | null;

  @Column({
    type: 'bigint',
    comment: '创建时间（毫秒时间戳，用于路C取最新排序）',
    default: () => Date.now(),
  })
  createdAt: number;

  @Column({
    type: 'bigint',
    comment: '更新时间（毫秒时间戳）',
    default: () => Date.now(),
  })
  updatedAt: number;
}

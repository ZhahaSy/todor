import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserMemory } from './entities/user-memory.entity';

export interface CreateMemoryInput {
  userId: string;
  content: string;
  category?: string;
  subject?: string;
  confidence?: string;
  sensitivity?: string;
  temporality?: string;
  expiresHint?: string | null;
  source?: string | null;
}

/**
 * 长期记忆服务。第一期只支持显式 写入 / 召回 / 删除。
 *
 * 鉴权完全仿 TodoService：所有读写按 userId 隔离，跨用户操作抛 ForbiddenException。
 * 召回采用"路 C"：同 subject+category 只取最新一条，用召回规则规避新旧冲突，
 * 不在写入时做语义冲突判断（见 docs/long-term-memory-design.md §5）。
 */
@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(
    @InjectRepository(UserMemory)
    private readonly memoryRepo: Repository<UserMemory>,
  ) {}

  async create(input: CreateMemoryInput): Promise<UserMemory> {
    const memory = this.memoryRepo.create({
      userId: input.userId,
      content: input.content,
      category: input.category ?? 'other',
      subject: input.subject ?? 'self',
      confidence: input.confidence ?? 'stated',
      sensitivity: input.sensitivity ?? 'normal',
      temporality: input.temporality ?? 'permanent',
      expiresHint: input.expiresHint ?? null,
      source: input.source ?? null,
      status: 'active',
    });
    return this.memoryRepo.save(memory);
  }

  /**
   * 是否已有"实质相同"的 active 记忆 —— 用于自动写入前去重，避免与 save_memory 工具
   * 写入的内容双写、或同一事实反复存。
   *
   * 判据：同 userId + 同 subject，且 content 互相包含（归一化去掉"用户"等前缀后）。
   * 用"包含"而非精确相等，是因为工具存的"对花生过敏"和抽取存的"用户对花生过敏"措辞略不同。
   * 注意只比同 subject，避免"花生过敏"误判等同"海鲜过敏"（两者都 self/health 但 content 不含）。
   */
  async hasSimilarActive(
    userId: string,
    subject: string,
    content: string,
  ): Promise<boolean> {
    const norm = (s: string) => s.replace(/^用户/, '').trim();
    const target = norm(content);
    if (!target) return false;
    const rows = await this.memoryRepo.find({
      where: { userId, subject, status: 'active' },
    });
    return rows.some((r) => {
      const c = norm(r.content);
      return c.includes(target) || target.includes(c);
    });
  }

  /**
   * 召回：只取 active；可选 category 过滤、关键词模糊匹配。
   * 路 C：同 (subject, category) 仅保留 createdAt 最新一条，规避新旧并存。
   */
  async recall(params: {
    userId: string;
    category?: string;
    keyword?: string;
    limit?: number;
  }): Promise<UserMemory[]> {
    const qb = this.memoryRepo
      .createQueryBuilder('m')
      .where('m.userId = :userId', { userId: params.userId })
      .andWhere('m.status = :status', { status: 'active' });

    if (params.category) {
      qb.andWhere('m.category = :category', { category: params.category });
    }
    if (params.keyword) {
      qb.andWhere('m.content LIKE :kw', { kw: `%${params.keyword}%` });
    }
    qb.orderBy('m.createdAt', 'DESC');

    // 返回同类全部 active（不再"同 subject+category 取最新"）—— 否则会把"多个并存事实"
    // （如花生过敏+海鲜过敏，都 self/health）误当新旧版本，只召回一条、漏掉其余。
    // 写入侧用 hasSimilarActive 拦近重复防双写；真正的"改主意"去重（supersede）留第三期。
    return (await qb.getMany()).slice(0, params.limit ?? 20);
  }

  /**
   * 显式删除：按关键词在 content 中模糊匹配该用户的 active 记忆，标记为 deleted。
   * 返回被删除的条数。用户主动遗忘，存删对称。
   */
  async softDeleteByKeyword(userId: string, keyword: string): Promise<number> {
    const targets = await this.memoryRepo.find({
      where: { userId, status: 'active' },
    });
    const matched = targets.filter((m) => m.content.includes(keyword));
    for (const m of matched) {
      m.status = 'deleted';
      await this.memoryRepo.save(m);
    }
    return matched.length;
  }

  /** 按 id 删除（校验归属，非属主抛 ForbiddenException） */
  async softDeleteById(id: string, userId: string): Promise<void> {
    const memory = await this.memoryRepo.findOne({ where: { id } });
    if (!memory || memory.userId !== userId) {
      throw new ForbiddenException('无权操作该记忆或记忆不存在');
    }
    memory.status = 'deleted';
    await this.memoryRepo.save(memory);
  }
}

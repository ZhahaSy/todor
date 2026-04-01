import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CreateChatDto } from './dto/create-chat.dto';
import { ChatHistory } from './entities/chat-history.entity';
import { DeepDiveExtra } from './entities/deep-dive-extra.entity';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class ChatHistoryService {
  constructor(
    @InjectRepository(ChatHistory)
    private readonly chatRepository: Repository<ChatHistory>,
    @InjectRepository(DeepDiveExtra)
    private readonly deepDiveExtraRepository: Repository<DeepDiveExtra>,
    private readonly redisService: RedisService,
  ) {}

  /** 统一为无前缀 UUID，与前端 URL ?session= 一致 */
  private normalizeDeepDiveSessionId(sessionId: string): string {
    return sessionId.startsWith('deepdive:')
      ? sessionId.slice('deepdive:'.length)
      : sessionId;
  }

  async create(
    createChatDto: CreateChatDto & { sessionId: string; userId: string },
  ): Promise<ChatHistory> {
    const newChat = this.chatRepository.create(createChatDto);
    return this.chatRepository.save(newChat);
  }

  async findAll({
    sessionId,
    userId,
    limit = 10,
    offset = 0,
  }: {
    sessionId: string;
    userId: string;
    limit?: number;
    offset?: number;
  }): Promise<{ list: ChatHistory[]; total: number }> {
    const [list, total] = await this.chatRepository.findAndCount({
      where: { sessionId, userId },
      order: { date: 'DESC' },
      take: limit,
      skip: offset,
    });
    list.reverse();
    return { list, total };
  }

  /**
   * 查询当前用户所有深入会话（按 userId 隔离，排除主对话 sessionId）
   */
  async findSessions(
    userId: string,
    mainSessionId: string,
  ): Promise<{ sessionId: string; title: string; lastDate: string }[]> {
    const rows = await this.chatRepository
      .createQueryBuilder('c')
      .select('c.sessionId', 'sessionId')
      .addSelect('MAX(c.date)', 'lastDate')
      .addSelect('MIN(c.title)', 'title')
      .where('c.userId = :userId', { userId })
      .andWhere('c.sessionId != :mainSessionId', { mainSessionId })
      .andWhere('c.sessionId IS NOT NULL')
      .groupBy('c.sessionId')
      .orderBy('lastDate', 'DESC')
      .getRawMany<{
        sessionId: string;
        lastDate: string;
        title: string | null;
      }>();

    return rows.map((r) => ({
      sessionId: r.sessionId,
      title: r.title ?? r.sessionId.slice(0, 8),
      lastDate: r.lastDate,
    }));
  }

  async getDeepDiveExtra(
    userId: string,
    sessionId: string,
  ): Promise<{ extraContext: string }> {
    const sid = this.normalizeDeepDiveSessionId(sessionId);
    const row = await this.deepDiveExtraRepository.findOne({
      where: { userId, sessionId: sid },
    });
    return { extraContext: row?.extraContext ?? '' };
  }

  async upsertDeepDiveExtra(
    userId: string,
    sessionId: string,
    extraContext: string,
  ): Promise<void> {
    const sid = this.normalizeDeepDiveSessionId(sessionId);
    const existing = await this.deepDiveExtraRepository.findOne({
      where: { userId, sessionId: sid },
    });
    if (existing) {
      existing.extraContext = extraContext;
      await this.deepDiveExtraRepository.save(existing);
      return;
    }
    await this.deepDiveExtraRepository.save(
      this.deepDiveExtraRepository.create({
        userId,
        sessionId: sid,
        extraContext,
      }),
    );
  }

  /**
   * 删除深入会话：消息记录、追加文本、Redis 中的该会话记忆
   */
  async deleteDeepDiveSession(userId: string, sessionId: string): Promise<void> {
    const raw = this.normalizeDeepDiveSessionId(sessionId);
    const sessionVariants = [raw, `deepdive:${raw}`];
    await this.chatRepository.delete({
      userId,
      sessionId: In(sessionVariants),
    });
    await this.deepDiveExtraRepository.delete({ userId, sessionId: raw });

    const redisKey = `memory:user:${userId}:deepdive:${raw}:history`;
    await this.redisService.del(redisKey);
  }
}

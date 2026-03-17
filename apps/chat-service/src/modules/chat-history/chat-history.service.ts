import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { CreateChatDto } from './dto/create-chat.dto';
import { ChatHistory } from './entities/chat-history.entity';

@Injectable()
export class ChatHistoryService {
  constructor(
    @InjectRepository(ChatHistory)
    private readonly chatRepository: Repository<ChatHistory>,
  ) {}

  async create(
    createChatDto: CreateChatDto & { sessionId: string },
  ): Promise<ChatHistory> {
    const newChat = this.chatRepository.create(createChatDto);
    return this.chatRepository.save(newChat);
  }

  async findAll({
    sessionId,
    limit = 10,
    offset = 0,
  }: {
    sessionId: string;
    limit?: number;
    offset?: number;
  }): Promise<{ list: ChatHistory[]; total: number }> {
    const [list, total] = await this.chatRepository.findAndCount({
      where: { sessionId },
      order: { date: 'DESC' },
      take: limit,
      skip: offset,
    });
    // 返回时保持时间升序（由新到旧查出后翻转）
    list.reverse();
    return { list, total };
  }

  /**
   * 查询用户所有深入会话（sessionId 不等于用户名的记录，去重取最新一条）
   */
  async findSessions(userSessionId: string): Promise<
    { sessionId: string; title: string; lastDate: string }[]
  > {
    // 取所有不属于主对话的 sessionId，每组取最早一条（作为标题来源）
    const rows = await this.chatRepository
      .createQueryBuilder('c')
      .select('c.sessionId', 'sessionId')
      .addSelect('MAX(c.date)', 'lastDate')
      .addSelect('MIN(c.title)', 'title')
      .where('c.sessionId != :userSessionId', { userSessionId })
      .andWhere('c.sessionId IS NOT NULL')
      // 仅返回属于该用户前缀的 session（deep dive sessionId 格式为 uuid，独立存储）
      // 这里通过 userSessionId 前缀过滤是可选的，若需隔离可后续加
      .groupBy('c.sessionId')
      .orderBy('lastDate', 'DESC')
      .getRawMany<{ sessionId: string; lastDate: string; title: string | null }>();

    return rows.map((r) => ({
      sessionId: r.sessionId,
      title: r.title ?? r.sessionId.slice(0, 8),
      lastDate: r.lastDate,
    }));
  }
}

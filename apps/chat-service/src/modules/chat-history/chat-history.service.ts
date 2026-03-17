import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateChatDto } from './dto/create-chat.dto';
import { ChatHistory } from './entities/chat-history.entity';

@Injectable()
export class ChatHistoryService {
  constructor(
    @InjectRepository(ChatHistory)
    private readonly chatRepository: Repository<ChatHistory>,
  ) {}

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
      .getRawMany<{ sessionId: string; lastDate: string; title: string | null }>();

    return rows.map((r) => ({
      sessionId: r.sessionId,
      title: r.title ?? r.sessionId.slice(0, 8),
      lastDate: r.lastDate,
    }));
  }
}

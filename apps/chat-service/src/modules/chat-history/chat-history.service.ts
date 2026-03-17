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
}

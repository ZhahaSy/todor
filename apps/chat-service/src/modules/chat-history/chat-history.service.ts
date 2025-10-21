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

  async findAll({ sessionId }: { sessionId: string }): Promise<ChatHistory[]> {
    const data = await this.chatRepository.find({
      where: { sessionId },
      order: { date: 'ASC' },
    });
    return data;
  }
}

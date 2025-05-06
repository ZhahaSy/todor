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

  async create(createChatDto: CreateChatDto): Promise<ChatHistory> {
    const newChat = await this.chatRepository.create(createChatDto);
    return await this.chatRepository.save(newChat);
  }

  async findAll(): Promise<ChatHistory[]> {
    const data = await this.chatRepository.find({ order: { date: 'ASC' } });
    console.log('findAll', data);

    return data;
  }
}

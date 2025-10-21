import { Injectable } from '@nestjs/common';
import { Todo } from './entities/todo.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { In } from 'typeorm';

@Injectable()
export class TodoService {
  constructor(
    @InjectRepository(Todo)
    private readonly todoRepository: Repository<Todo>,
  ) {}

  async create(createTodoDto: Partial<Todo>) {
    const newTodo = await this.todoRepository.create(createTodoDto);
    return await this.todoRepository.save(newTodo);
  }
  async getTodoList({
    todoMonth,
    type,
    keyword,
    status,
    creator,
  }: {
    todoMonth?: string;
    type?: ('work' | 'life' | 'study' | 'all')[];
    keyword?: string;
    status?: string;
    creator?: string;
  }) {
    return await this.todoRepository.find({
      where: {
        // 必须数据
        creator: creator ? creator : undefined,
        isDeleted: false,
        // 可选数据
        title: keyword ? Like(`%${keyword}%`) : undefined,
        content: keyword ? Like(`%${keyword}%`) : undefined,
        todoTime: todoMonth ? Like(`${todoMonth}%`) : undefined,
        // 类型
        type: type?.includes('all')
          ? undefined
          : type && type.length > 0
            ? In(type.filter((t) => t !== 'all'))
            : undefined,
        // 状态
        status: status ? status : 'active',
      },
      // 状态
      order: { status: 'ASC', createTime: 'DESC' },
    });
  }
  async getTodoById(id: string) {
    return await this.todoRepository.findOne({
      where: { id, isDeleted: false },
    });
  }
  async deleteTodoById(id: string) {
    return await this.updateTodoById(id, { isDeleted: true });
  }

  async updateTodoById(id: string, updateTodoDto: Partial<Todo>) {
    return await this.todoRepository.update(id, updateTodoDto);
  }
}

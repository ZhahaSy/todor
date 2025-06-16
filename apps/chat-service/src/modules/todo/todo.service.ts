import { Injectable } from '@nestjs/common';
import { Todo } from './entities/todo.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

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
  async getTodoList() {
    return await this.todoRepository.find({
      where: { isDeleted: false },
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

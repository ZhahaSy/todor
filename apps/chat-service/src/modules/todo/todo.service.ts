import { ForbiddenException, Injectable } from '@nestjs/common';
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
    const newTodo = this.todoRepository.create(createTodoDto);
    return await this.todoRepository.save(newTodo);
  }

  async getTodoList({
    todoMonth,
    type,
    keyword,
    status,
    userId,
  }: {
    todoMonth?: string;
    type?: ('work' | 'life' | 'study' | 'all')[];
    keyword?: string;
    status?: string;
    userId?: string;
  }) {
    return await this.todoRepository.find({
      where: {
        // 归属：按 userId 过滤（权威归属）
        userId: userId ? userId : undefined,
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
      order: { status: 'ASC', createTime: 'DESC' },
    });
  }

  /** 按 id 查待办；传 userId 时强制归属校验，非属主返回 null */
  async getTodoById(id: string, userId?: string) {
    return await this.todoRepository.findOne({
      where: {
        id,
        isDeleted: false,
        ...(userId ? { userId } : {}),
      },
    });
  }

  async deleteTodoById(id: string, userId: string) {
    return await this.updateTodoById(id, userId, { isDeleted: true });
  }

  /**
   * 更新待办：先校验归属，非属主抛 ForbiddenException。
   * 不允许通过 dto 篡改 userId/id 等归属字段。
   */
  async updateTodoById(id: string, userId: string, updateTodoDto: Partial<Todo>) {
    const owned = await this.todoRepository.findOne({
      where: { id, userId, isDeleted: false },
    });
    if (!owned) {
      throw new ForbiddenException('无权操作该待办或待办不存在');
    }
    // 防止越权字段被覆盖
    const { id: _id, userId: _uid, creator: _creator, ...safe } = updateTodoDto;
    void _id;
    void _uid;
    void _creator;
    return await this.todoRepository.update(id, safe);
  }
}

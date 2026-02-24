import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { TodoService } from './todo.service';
import { Todo } from './entities/todo.entity';
import { ResOp } from '@/common/model/response.model';
import { JwtAuthGuard } from '@/common/guard/jwt.auth';
import { AdvancedSchedulerService } from '../schedule/advanced-scheduler.service';
import { UserService } from '../user/user.service';

// 查询参数 DTO 类
class TodoListQuery {
  todoMonth?: string;
  type?: string;
  keyword?: string;
  status?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('todo')
export class TodoController {
  constructor(
    private readonly todoService: TodoService,
    private readonly scheduleService: AdvancedSchedulerService,
    private readonly userService: UserService, // 新增依赖注入
  ) {}
  @Get('/list')
  async getTodoList(@Query() query: TodoListQuery, @Request() req) {
    // 直接从 JWT payload 中获取用户名，避免数据库查询
    const name = req.user.name;
    return ResOp.success(
      await this.todoService.getTodoList({
        todoMonth: query.todoMonth,
        type: query.type?.split(',') as ('work' | 'life' | 'study' | 'all')[],
        keyword: query.keyword,
        status: query.status,
        creator: name,
      }),
    );
  }
  @Get(':id')
  async getTodoById(@Param('id') id: string) {
    return ResOp.success(await this.todoService.getTodoById(id));
  }
  @Post('/delete')
  async deleteTodoById(@Body() { id }: { id: string }) {
    return ResOp.success(await this.todoService.deleteTodoById(id));
  }
  @Post('/update')
  async updateTodoById(@Body() updateTodoDto: Partial<Todo>) {
    return ResOp.success(
      await this.todoService.updateTodoById(updateTodoDto.id, updateTodoDto),
    );
  }

  @Post('/create')
  async createTodo(@Body() createTodoDto: Partial<Todo>, @Request() req) {
    // 先创建 todo 拿到真实 id，再用 id 注册调度任务
    const todo = await this.todoService.create(createTodoDto);
    const userEmail = req.user.email;
    await this.scheduleService.scheduleOneTimeEmail(
      todo.id,
      new Date(createTodoDto.todoTime),
      userEmail,
      '待办事项提醒: ' + createTodoDto.title,
      `您有一条待办事项：${createTodoDto.content}`,
    );
    return ResOp.success(todo);
  }
}

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
    return ResOp.success(
      await this.todoService.getTodoList({
        todoMonth: query.todoMonth,
        type: query.type?.split(',') as ('work' | 'life' | 'study' | 'all')[],
        keyword: query.keyword,
        status: query.status,
        userId: req.user.userId,
      }),
    );
  }
  @Get(':id')
  async getTodoById(@Param('id') id: string, @Request() req) {
    return ResOp.success(
      await this.todoService.getTodoById(id, req.user.userId),
    );
  }
  @Post('/delete')
  async deleteTodoById(@Body() { id }: { id: string }, @Request() req) {
    return ResOp.success(
      await this.todoService.deleteTodoById(id, req.user.userId),
    );
  }
  @Post('/update')
  async updateTodoById(@Body() updateTodoDto: Partial<Todo>, @Request() req) {
    return ResOp.success(
      await this.todoService.updateTodoById(
        updateTodoDto.id,
        req.user.userId,
        updateTodoDto,
      ),
    );
  }

  @Post('/create')
  async createTodo(@Body() createTodoDto: Partial<Todo>, @Request() req) {
    // 归属由后端从 JWT 注入，前端无法伪造
    const todo = await this.todoService.create({
      ...createTodoDto,
      userId: req.user.userId,
      creator: req.user.name,
    });
    const userEmail = req.user.email;
    if (createTodoDto.todoTime) {
      await this.scheduleService.scheduleOneTimeEmail(
        todo.id,
        createTodoDto.todoTime,
        userEmail,
        '待办事项提醒: ' + createTodoDto.title,
        `您有一条待办事项：${createTodoDto.content}`,
      );
    }
    return ResOp.success(todo);
  }
}

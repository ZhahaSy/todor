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

@UseGuards(JwtAuthGuard)
@Controller('todo')
export class TodoController {
  constructor(
    private readonly todoService: TodoService,
    private readonly scheduleService: AdvancedSchedulerService,
    private readonly userService: UserService, // 新增依赖注入
  ) {}
  @Get('/list')
  async getTodoList(
    @Query('todoMonth') todoMonth?: string,
    @Query('type') type?: string,
    @Query('keyword') keyword?: string,
    @Query('status') status?: string,
  ) {
    return ResOp.success(
      await this.todoService.getTodoList({
        todoMonth,
        type: type?.split(',') as ('work' | 'life' | 'study' | 'all')[],
        keyword,
        status,
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
    const userInfo = await this.userService.findOne({ id: req.user.id });
    console.log(
      createTodoDto.id,
      new Date(createTodoDto.todoTime),
      userInfo.email,
      '待办事项提醒: ' + createTodoDto.title,
      `您有一条待办事项：${createTodoDto.content}`,
    );
    await this.scheduleService.scheduleOneTimeEmail(
      createTodoDto.id,
      new Date(createTodoDto.todoTime),
      userInfo.email,
      '待办事项提醒: ' + createTodoDto.title,
      `您有一条待办事项：${createTodoDto.content}`,
    );
    return ResOp.success(await this.todoService.create(createTodoDto));
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TodoService } from './todo.service';
import { Todo } from './entities/todo.entity';
import { ResOp } from '@/common/model/response.model';
import { JwtAuthGuard } from '@/common/guard/jwt.auth';

@UseGuards(JwtAuthGuard)
@Controller('todo')
export class TodoController {
  constructor(private readonly todoService: TodoService) {}
  @Get('/list')
  async getTodoList(
    @Query('todoMonth') todoMonth?: string,
    @Query('type') type?: string,
  ) {
    return ResOp.success(
      await this.todoService.getTodoList({
        todoMonth,
        type: type?.split(',') as ('work' | 'life' | 'study' | 'all')[],
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
  async createTodo(@Body() createTodoDto: Partial<Todo>) {
    return ResOp.success(await this.todoService.create(createTodoDto));
  }
}

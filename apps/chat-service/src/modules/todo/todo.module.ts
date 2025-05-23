import { TypeOrmModule } from '@nestjs/typeorm';
import { Todo } from './entities/todo.entity';
import { Module } from '@nestjs/common';
import { TodoController } from './todo.controller';
import { TodoService } from './todo.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Todo]), // 添加实体注册
  ],
  controllers: [TodoController],
  providers: [TodoService],
  exports: [TodoService], // 导出服务和实体注册
})
export class TodoModule {}

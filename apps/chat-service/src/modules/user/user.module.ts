import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]), // 添加实体注册
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService], // 导出服务和实体注册
})
export class UserModule {}

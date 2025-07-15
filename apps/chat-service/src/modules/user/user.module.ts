import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]), // 添加实体注册
    AuthModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService, AuthModule, TypeOrmModule.forFeature([User])], // 导出服务和实体注册
})
export class UserModule {}

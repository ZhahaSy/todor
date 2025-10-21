import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AiModule } from './modules/ai/ai.module';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConfigModule } from '@nestjs/config';
import { ChatHistoryModule } from './modules/chat-history/chat-history.module';
import { TodoModule } from './modules/todo/todo.module';

import {
  utilities as nestWinstonModuleUtilities,
  WinstonModule,
} from 'nest-winston';
import { transports, format } from 'winston';
import 'winston-daily-rotate-file';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { MessageModule } from './modules/message/message.module';
import { ScheduleModule } from './modules/schedule/schedule.module';

export const IS_DEV = process.env.RUNNING_ENV !== 'prod';
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: IS_DEV ? 'dbs/chat.db' : '/home/dbs/chat.db',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: IS_DEV ? true : false, // 开发环境使用，生产环境需关闭
    }),

    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env', // 显式指定.env文件路径
    }),
    WinstonModule.forRoot({
      transports: [
        new transports.Console({
          format: format.combine(
            format.timestamp(),
            format.ms(),
            nestWinstonModuleUtilities.format.nestLike('Voltron Service', {
              colors: true,
              prettyPrint: true,
              processId: true,
              appName: true,
            }),
          ),
        }),
        // other transports...
      ],
    }),
    ScheduleModule,
    ChatHistoryModule,
    TodoModule,
    AiModule,
    AuthModule,
    UserModule,
    MessageModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

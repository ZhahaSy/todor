import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AiModule } from './modules/ai/ai.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Todo } from './modules/todo/entities/todo.entity';
import { ChatHistory } from './modules/chat-history/entities/chat-history.entity';
import { Notification } from './modules/message/entities/notification.entity';
import { ScheduledTask } from './modules/schedule/entities/scheduled-task.entity';
import { HubSkillDef } from './modules/skill/entities/hub-skill-def.entity';
import { User } from './modules/user/entities/user.entity';
import { Skill } from './modules/skill/entities/skill.entity';
import { DeepDiveExtra } from './modules/chat-history/entities/deep-dive-extra.entity';
import { UserMemory } from './modules/memory/entities/user-memory.entity';

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
import { SkillModule } from './modules/skill/skill.module';
import { MemoryModule } from './modules/memory/memory.module';

export const IS_DEV = process.env.RUNNING_ENV !== 'prod';
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database:
        process.env.DB_DATABASE ||
        (IS_DEV ? 'dbs/chat.db' : '/var/data/chat-service/chat.db'),
      entities: [Todo, ChatHistory, Notification, ScheduledTask, HubSkillDef, User, Skill, DeepDiveExtra, UserMemory],
      synchronize: true, // 自动同步表结构（新表/新列），pm2 reload 已固化 env，不再有误触风险
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
    ChatHistoryModule,
    TodoModule,
    MessageModule,
    ScheduleModule,
    AiModule,
    AuthModule,
    UserModule,
    SkillModule,
    MemoryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageController } from './message.controller';
import { EmailService } from './email.service';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';
import { Notification } from './entities/notification.entity';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    forwardRef(() => UserModule),
  ],
  controllers: [MessageController],
  providers: [EmailService, NotificationService, NotificationGateway],
  exports: [EmailService, NotificationService, NotificationGateway],
})
export class MessageModule {}

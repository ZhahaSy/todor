import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { MessageController } from './message.controller';

@Module({
  controllers: [MessageController],
  providers: [EmailService],
  exports: [EmailService],
})
export class MessageModule {}

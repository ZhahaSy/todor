import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import * as dotenv from 'dotenv';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ResOp } from '@/common/model/response.model';

dotenv.config(); // 添加这行加载.env文件

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Swagger配置
  const config = new DocumentBuilder()
    .setTitle('Chat Service API')
    .setDescription('AI聊天服务接口文档')
    .setVersion('1.0')
    .addTag('AI')
    .build();
  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [ResOp],
    ignoreGlobalPrefix: false,
  });
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
}
bootstrap();

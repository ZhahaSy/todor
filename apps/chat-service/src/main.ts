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

  const MAX_RETRY = 5; // 最大重试次数
  let port = 3000;
  let retryCount = 0;

  while (retryCount < MAX_RETRY) {
    try {
      await app.listen(port);
      console.log(`\x1b[32mApplication is running on port ${port}\x1b[0m`);
      break;
    } catch (error) {
      if (error.code === 'EADDRINUSE') {
        console.log(
          `\x1b[33mPort ${port} is in use, trying port ${port + 1}...\x1b[0m`,
        );
        port++;
        retryCount++;
      } else {
        throw error;
      }
    }
  }

  if (retryCount === MAX_RETRY) {
    console.error(
      '\x1b[31mFailed to find available port after 5 attempts\x1b[0m',
    );
    process.exit(1);
  }
}
bootstrap();

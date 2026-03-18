import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import * as dotenv from 'dotenv';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ResOp } from '@/common/model/response.model';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

dotenv.config(); // 添加这行加载.env文件

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });
  app.use(require('express').json({ limit: '10mb' }));
  app.use(require('express').urlencoded({ limit: '10mb', extended: true }));

  // 安全响应头
  app.use(helmet());

  // 速率限制：15 分钟内同一 IP 最多 100 次请求
  app.use(
    '/api/',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: { code: 429, msg: '请求过于频繁，请稍后再试' },
    }),
  );

  // 登录接口单独限流：15 分钟内同一 IP 最多 10 次
  app.use(
    '/api/user/login',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
      message: { code: 429, msg: '登录尝试过于频繁，请 15 分钟后再试' },
    }),
  );

  // 添加cookie-parser中间件
  app.use(cookieParser());

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
  SwaggerModule.setup('swagger', app, document);

  const port = process.env.PORT ?? 3000;
  app.enableShutdownHooks();

  // watch 模式下旧进程刚被 kill，端口释放需要一点时间，最多重试 10 次（每次等 500ms）
  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      await app.listen(port);
      console.log(`\x1b[32mApplication is running on port ${port}\x1b[0m`);
      break;
    } catch (err: any) {
      if (err.code === 'EADDRINUSE' && attempt < 10) {
        console.log(`\x1b[33mPort ${port} busy, retrying (${attempt}/10)...\x1b[0m`);
        await new Promise((r) => setTimeout(r, 500));
      } else {
        throw err;
      }
    }
  }
}
bootstrap();

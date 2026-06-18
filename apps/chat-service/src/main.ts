import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import * as dotenv from 'dotenv';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ResOp } from '@/common/model/response.model';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import {
  utf8JsonMiddleware,
  utf8UrlencodedMiddleware,
} from './utf8-body-parser';

dotenv.config(); // 添加这行加载.env文件

// JWT_SECRET 缺失即拒绝启动：没有它就只能用代码里的兜底密钥签名 token，等于鉴权失效。
// 放在 dotenv.config() 之后是唯一能可靠读到 .env / 容器 env 的时机。
if (!process.env.JWT_SECRET) {
  // eslint-disable-next-line no-console
  console.error(
    '[FATAL] JWT_SECRET 未配置。请在部署环境（如 ECS 的 chat-service.env）设置一个足够随机的长字符串后再启动。',
  );
  process.exit(1);
}

const BODY_LIMIT = 10 * 1024 * 1024;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });
  // 不使用 express.json/urlencoded，避免拉取 raw-body → iconv-lite（pnpm 下 0.7.x 缺 encodings）
  app.use(utf8JsonMiddleware({ limit: BODY_LIMIT }));
  app.use(utf8UrlencodedMiddleware({ limit: BODY_LIMIT, extended: true }));

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

  // Swagger配置：仅非生产环境暴露，避免线上公开全部接口结构
  if (process.env.NODE_ENV !== 'production') {
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
  }

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
        console.log(
          `\x1b[33mPort ${port} busy, retrying (${attempt}/10)...\x1b[0m`,
        );
        await new Promise((r) => setTimeout(r, 500));
      } else {
        throw err;
      }
    }
  }
}
bootstrap();

# Redis + BufferWindowMemory 实现说明

## 概述

本项目实现了基于 Redis 的对话上下文缓存功能，使用自定义的 `RedisChatMemory` 类实现了 BufferWindowMemory 的功能。这允许 AI 助手记住与用户的对话历史，提供更连贯的对话体验。

## 架构组件

### 1. RedisService (`src/modules/redis/redis.service.ts`)
- 管理 Redis 连接
- 提供基础的 Redis 操作方法（get, set, del, keys, exists）
- 自动重连机制

### 2. RedisChatMemory (`src/modules/ai/memory/redis-chat-memory.ts`)
- 继承自 LangChain 的 `BaseChatMemory`
- 实现滑动窗口记忆功能（BufferWindowMemory）
- 将对话历史存储在 Redis 中
- 支持以下功能：
  - **滑动窗口**：只保留最近 k 对对话（默认 10 对）
  - **TTL 支持**：可设置对话历史过期时间（默认 7 天）
  - **会话隔离**：每个用户有独立的对话历史

### 3. ChatIntentHandler 更新
- 集成 `RedisChatMemory` 进行对话上下文管理
- 每次对话前从 Redis 加载历史记录
- 每次对话后保存新的对话到 Redis

## 配置

在 `.env` 文件中添加以下配置：

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

## 安装依赖

已安装的依赖包：
```bash
pnpm add ioredis @langchain/community
```

## Redis 数据结构

### Key 格式
```
memory:{sessionId}:{memoryKey}
```

例如：`memory:user:123:history`

### 存储格式
使用 Redis List 数据结构，每条消息存储为 JSON：

```json
{
  "type": "human",
  "content": "用户消息内容"
}
```

```json
{
  "type": "ai",
  "content": "AI 回复内容"
}
```

## 使用示例

### 基本用法

```typescript
// 创建内存实例
const memory = new RedisChatMemory({
  redis: redisService.getClient(),
  sessionId: `user:${userId}`,
  k: 10, // 保留最近 10 对对话
  ttl: 3600 * 24 * 7, // 7 天过期
  memoryKey: 'history',
  returnMessages: false, // 返回字符串格式的历史
});

// 加载历史记录
const memoryVariables = await memory.loadMemoryVariables({});
const chatHistory = memoryVariables.history;

// 保存对话
await memory.saveContext(
  { input: '用户输入' },
  { output: 'AI 回复' }
);

// 清除历史
await memory.clear();
```

### 调试方法

```typescript
// 获取所有消息（不限窗口）
const allMessages = await memory.getAllMessages();

// 获取消息数量
const count = await memory.getMessageCount();
```

## 配置参数说明

### RedisChatMemory 参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `redis` | Redis | 必填 | Redis 客户端实例 |
| `sessionId` | string | 必填 | 会话 ID，用于区分不同用户/会话 |
| `k` | number | 10 | 滑动窗口大小（对话对数） |
| `ttl` | number | 可选 | 过期时间（秒） |
| `memoryKey` | string | 'chat_history' | 内存变量的键名 |
| `returnMessages` | boolean | false | 是否返回消息对象（true）或字符串（false） |

## 性能优化建议

1. **TTL 设置**：根据实际需求设置合适的 TTL，避免无限制存储
2. **窗口大小**：根据模型的上下文窗口限制调整 `k` 值
3. **Redis 连接池**：对于高并发场景，考虑使用 Redis 集群

## 启动 Redis

### 使用 Homebrew (macOS) - 推荐
```bash
# 安装 Redis
brew install redis

# 启动 Redis 服务
brew services start redis

# 停止 Redis 服务（如需要）
brew services stop redis

# 重启 Redis 服务（如需要）
brew services restart redis
```

### 使用 Docker
```bash
docker run -d --name redis -p 6379:6379 redis:latest
```

### 验证连接
```bash
redis-cli ping
# 应返回: PONG
```

## 故障排查

### 连接问题
如果 Redis 连接失败，检查：
1. Redis 服务是否启动
2. `.env` 中的配置是否正确
3. 防火墙设置是否允许连接

### 查看 Redis 数据
```bash
# 连接 Redis CLI
redis-cli

# 查看所有内存键
KEYS memory:*

# 查看特定用户的历史
LRANGE memory:user:123:history 0 -1

# 查看键的 TTL
TTL memory:user:123:history
```

## 后续改进建议

1. 添加对话历史的压缩功能，减少存储空间
2. 实现对话摘要功能，保留更长时间的上下文
3. 添加对话历史导出功能
4. 实现多会话管理（同一用户的不同对话线程）

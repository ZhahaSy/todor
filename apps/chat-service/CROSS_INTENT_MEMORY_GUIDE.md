# 跨意图记忆共享 - 使用指南

## 📋 问题背景

### 原有问题
在升级前，每个意图（chat、todo 等）都有独立的记忆存储：
- chat 意图：`user:123:chat`
- todo 意图：`user:123:todo`

**导致的问题场景：**
```
用户: 如何实现 Redis 分布式锁？  → [chat 意图处理]
AI: 可以使用 SET NX EX 命令...   → [存储到 chat 记忆]

用户: 帮我把最近聊的整理成待办  → [todo 意图处理]
AI: ✅ 待办：整理待办              ❌ 无法访问 chat 的历史！
```

todo 意图只能访问自己的历史记录，看不到刚才 chat 的技术讨论内容。

---

## ✨ 升级方案

### 核心改进
1. **全局共享记忆（默认）** - 所有意图共享同一个对话历史 `user:123:global`
2. **意图隔离记忆（可选）** - 保留原有的意图隔离能力
3. **跨意图访问** - 允许访问特定意图的历史记录
4. **组合历史加载** - 从多个来源合并历史记录

---

## 🚀 新功能使用

### 1. 默认行为（全局共享记忆）

所有 IntentHandler 默认使用全局共享记忆，无需修改代码：

```typescript
// ChatIntentHandler 和 TodoIntentHandler 都会自动使用全局记忆
const memory = this.createMemory(this.redisService.getClient(), inputData);
```

**效果：**
```
用户: 如何实现 Redis 分布式锁？  → [存储到 user:123:global]
AI: 可以使用 SET NX EX 命令...   → [存储到 user:123:global]

用户: 帮我把最近聊的整理成待办  → [读取 user:123:global]
AI: ✅ 待办：学习 Redis 分布式锁  ✅ 能看到完整对话！
    内容：使用 SET NX EX 命令实现...
```

---

### 2. 使用意图隔离记忆

如果某个意图需要独立的记忆空间，可以覆盖 `memoryScope` 属性：

```typescript
@Injectable()
export class PrivateChatIntentHandler extends BaseIntentHandler {
  // 设置为意图隔离模式
  protected readonly memoryScope: 'global' | 'intent' = 'intent';

  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
  ) {
    super();
  }

  getIntent(): string {
    return 'private-chat';
  }

  async process(inputData: InputData): Promise<ProcessedResult> {
    // createMemory 会自动使用意图隔离模式
    const memory = this.createMemory(this.redisService.getClient(), inputData);
    // sessionId 会是: user:123:private-chat
    // ...
  }
}
```

---

### 3. 临时覆盖记忆策略

在调用 `createMemory` 时临时指定策略：

```typescript
async process(inputData: InputData): Promise<ProcessedResult> {
  // 临时使用意图隔离
  const intentMemory = this.createMemory(
    this.redisService.getClient(),
    inputData,
    { scope: 'intent' }
  );

  // 临时使用全局记忆
  const globalMemory = this.createMemory(
    this.redisService.getClient(),
    inputData,
    { scope: 'global' }
  );
}
```

---

### 4. 跨意图访问历史

访问其他意图的历史记录：

```typescript
async process(inputData: InputData): Promise<ProcessedResult> {
  // 加载 chat 意图的历史记录
  const chatHistory = await this.loadCrossIntentHistory(
    this.redisService.getClient(),
    inputData,
    'chat',
    { k: 5 } // 只加载最近 5 条
  );

  console.log('Chat 历史:', chatHistory);
}
```

---

### 5. 组合多个来源的历史

同时加载多个来源的历史记录：

```typescript
async process(inputData: InputData): Promise<ProcessedResult> {
  // 加载全局记忆 + chat 意图的历史
  const combinedHistory = await this.loadCombinedHistory(
    this.redisService.getClient(),
    inputData,
    ['global', 'chat']
  );

  // 输出格式：
  // [global对话]
  // Human: xxx
  // AI: xxx
  //
  // ---
  //
  // [chat对话]
  // Human: xxx
  // AI: xxx
}
```

---

### 6. 清除记忆

清除指定范围的记忆：

```typescript
async clearUserMemory(inputData: InputData): Promise<void> {
  // 清除全局记忆
  await this.clearMemory(
    this.redisService.getClient(),
    inputData,
    'global'
  );

  // 清除当前意图的记忆
  await this.clearMemory(
    this.redisService.getClient(),
    inputData,
    'intent'
  );
}
```

---

## 🔧 API 参考

### BaseIntentHandler 新增方法

#### `createGlobalMemory()`
创建全局共享记忆实例。

```typescript
protected createGlobalMemory(
  redis: Redis,
  inputData: InputData,
  options?: {
    k?: number;              // 保留最近 k 条消息，默认 10
    ttl?: number;            // 过期时间（秒），默认 7 天
    memoryKey?: string;      // 记忆键名，默认 'history'
    returnMessages?: boolean; // 是否返回消息对象，默认 false
  }
): RedisChatMemory
```

#### `createIntentMemory()`
创建意图专属记忆实例。

```typescript
protected createIntentMemory(
  redis: Redis,
  inputData: InputData,
  options?: {
    k?: number;
    ttl?: number;
    memoryKey?: string;
    returnMessages?: boolean;
  }
): RedisChatMemory
```

#### `createMemory()`
根据策略智能创建记忆实例。

```typescript
protected createMemory(
  redis: Redis,
  inputData: InputData,
  options?: {
    k?: number;
    ttl?: number;
    memoryKey?: string;
    returnMessages?: boolean;
    scope?: 'global' | 'intent'; // 临时覆盖策略
  }
): RedisChatMemory
```

#### `loadCrossIntentHistory()`
加载指定意图的历史记录。

```typescript
protected async loadCrossIntentHistory(
  redis: Redis,
  inputData: InputData,
  targetIntent: string,      // 目标意图名称，如 'chat', 'todo'
  options?: { k?: number }   // 加载最近 k 条消息
): Promise<string>
```

#### `loadCombinedHistory()`
加载并合并多个来源的历史记录。

```typescript
protected async loadCombinedHistory(
  redis: Redis,
  inputData: InputData,
  sources: Array<'global' | string> // 'global' 或具体意图名
): Promise<string>
```

#### `clearMemory()`
清除指定范围的记忆。

```typescript
protected async clearMemory(
  redis: Redis,
  inputData: InputData,
  scope: 'global' | 'intent' = 'global'
): Promise<void>
```

---

## 📊 记忆策略对比

| 特性 | 全局记忆 (global) | 意图隔离 (intent) |
|------|------------------|------------------|
| SessionId | `user:123:global` | `user:123:chat` |
| 跨意图访问 | ✅ 自动支持 | ❌ 需要手动实现 |
| 上下文隔离 | ❌ 所有意图共享 | ✅ 意图间隔离 |
| 使用场景 | 通用对话助手 | 隐私敏感场景 |
| 记忆增长 | 较快 | 较慢 |

---

## 🧪 测试验证

### 运行测试脚本

```bash
# 给脚本添加执行权限
chmod +x test-cross-intent-memory.sh

# 运行测试
./test-cross-intent-memory.sh
```

### 测试场景

脚本会模拟以下场景：

1. **步骤 1：** 用户询问技术问题（chat 意图）
   - 输入："如何实现 Redis 分布式锁？"
   - AI 回复技术细节

2. **步骤 2：** 用户创建待办（todo 意图）
   - 输入："帮我把最近聊的技术内容整理成待办"
   - 验证待办标题和内容是否包含步骤 1 的技术讨论

### 预期结果

✅ **成功标志：**
- 待办标题包含 "Redis"、"分布式锁" 或 "Lua" 等关键词
- 待办内容包含技术细节
- 待办类型为 "study" 或 "work"

❌ **失败标志：**
- 待办标题是 "整理待办" 等泛化内容
- 待办内容没有提取到具体技术信息

---

## 🎯 最佳实践

### 1. 默认使用全局记忆
对于大多数场景，全局记忆能提供最好的用户体验：
```typescript
// 推荐：使用默认策略
const memory = this.createMemory(this.redisService.getClient(), inputData);
```

### 2. 敏感场景使用意图隔离
对于隐私敏感的意图，使用意图隔离：
```typescript
protected readonly memoryScope = 'intent';
```

### 3. 合理设置 k 值
根据意图特点调整历史记录数量：
- Chat：需要较多上下文，k=15
- Todo：只需最近对话，k=8

```typescript
const memory = this.createMemory(
  this.redisService.getClient(),
  inputData,
  { k: 15 }
);
```

### 4. 定期清理长期不用的记忆
```typescript
// 可以在用户登出或长时间不活跃时清理
await this.clearMemory(redis, inputData, 'global');
```

---

## 🔄 迁移指南

### 从旧版本迁移

**好消息：** 无需修改任何代码！

升级后，所有现有的 IntentHandler 会自动使用全局记忆。如果需要保持意图隔离，只需添加一行：

```typescript
export class YourIntentHandler extends BaseIntentHandler {
  protected readonly memoryScope = 'intent'; // 添加这行
  // ...
}
```

---

## ❓ 常见问题

### Q1: 全局记忆会不会导致记忆无限增长？
A: 不会。Redis 记忆有两个保护机制：
1. `k` 参数限制最多保留 k 条消息
2. `ttl` 参数设置过期时间（默认 7 天）

### Q2: 如何在特定场景下临时使用意图隔离？
A: 使用 `scope` 选项：
```typescript
const memory = this.createMemory(redis, inputData, { scope: 'intent' });
```

### Q3: 可以同时使用多个记忆实例吗？
A: 可以！你可以同时创建全局记忆和意图记忆：
```typescript
const globalMemory = this.createGlobalMemory(redis, inputData);
const intentMemory = this.createIntentMemory(redis, inputData);
```

### Q4: 跨意图访问会影响性能吗？
A: 影响很小。Redis 的读取操作非常快，加载历史记录通常在 10ms 以内。

---

## 📚 相关文档

- [Redis Memory 实现](./REDIS_MEMORY_SETUP.md)
- [快速开始指南](./QUICK_START.md)
- [实现总结](./IMPLEMENTATION_SUMMARY.md)

---

## 📝 变更日志

### v2.0.0 - 2024-01-23
- ✨ 新增全局共享记忆功能
- ✨ 新增跨意图访问能力
- ✨ 新增组合历史加载
- ✨ 新增记忆清理接口
- 🔧 优化 TodoIntentHandler 的 prompt
- 📝 添加完整的使用文档和测试脚本

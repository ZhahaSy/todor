# 快速开始 - Redis 对话记忆

## ⚡ 5 分钟快速启动

### 1. 确保 Redis 正在运行
```bash
# 检查 Redis 状态
redis-cli ping
# 应返回: PONG

# 如果未运行，启动 Redis
brew services start redis
```

### 2. 启动聊天服务
```bash
# 在项目根目录
pnpm start:s
```

服务将在 `http://localhost:3001` 启动

### 3. 测试对话记忆

**第一条消息:**
```bash
curl -X POST http://localhost:3001/ai/message \
  -H "Content-Type: application/json" \
  -d '{
    "input": "你好，我叫小明，我喜欢打篮球",
    "userInfo": {
      "id": 1,
      "name": "小明",
      "age": 25,
      "gender": "男",
      "hobby": "篮球"
    }
  }'
```

**第二条消息（测试记忆）:**
```bash
curl -X POST http://localhost:3001/ai/message \
  -H "Content-Type: application/json" \
  -d '{
    "input": "你还记得我叫什么名字吗？",
    "userInfo": {
      "id": 1,
      "name": "小明",
      "age": 25,
      "gender": "男",
      "hobby": "篮球"
    }
  }'
```

AI 应该能够回答出你的名字！

### 4. 查看 Redis 中的数据
```bash
# 查看所有内存键
redis-cli KEYS "memory:*"

# 查看用户 1 的对话历史
redis-cli LRANGE memory:user:1:history 0 -1
```

## 🎯 关键特性

- ✅ **自动保存** - 每次对话自动保存到 Redis
- ✅ **自动加载** - 每次对话自动加载历史
- ✅ **智能管理** - 只保留最近 10 对对话
- ✅ **自动过期** - 7 天后自动清理

## 📚 更多文档

- 详细设置: [REDIS_MEMORY_SETUP.md](./REDIS_MEMORY_SETUP.md)
- 实现总结: [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)

## 🐛 常见问题

**Q: Redis 连接失败？**
```bash
# 检查 Redis 是否运行
redis-cli ping

# 启动 Redis
brew services start redis
```

**Q: 如何清除某个用户的对话历史？**
```bash
redis-cli DEL memory:user:1:history
```

**Q: 如何调整记忆窗口大小？**

编辑 `src/modules/ai/intent-handlers/chat.intent-handler.ts`:
```typescript
const memory = new RedisChatMemory({
  // ...
  k: 20, // 改为 20 对对话
  // ...
});
```

## 🎉 完成！

现在您的 AI 助手具备了对话记忆能力，可以提供更智能、更连贯的对话体验！

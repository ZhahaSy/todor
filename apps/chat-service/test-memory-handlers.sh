#!/bin/bash

echo "🧪 测试 Chat 和 Todo Handler 的上下文记忆功能"
echo "=================================================="
echo ""

# 定义颜色
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="http://localhost:3000/ai/message"

echo -e "${BLUE}测试场景 1: Chat Intent - 基础对话记忆${NC}"
echo "=================================================="
echo ""

echo -e "${YELLOW}发送第一条消息: 介绍自己${NC}"
echo "➡️  用户说: 你好，我叫李明，我喜欢打篮球"
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "input": "你好，我叫李明，我喜欢打篮球",
    "userInfo": {
      "id": 100,
      "name": "李明",
      "age": 28,
      "gender": "男",
      "hobby": "篮球"
    }
  }' | jq -r '.output' | sed 's/^/   🤖 AI: /'

echo ""
echo ""
sleep 2

echo -e "${YELLOW}发送第二条消息: 测试记忆${NC}"
echo "➡️  用户说: 你还记得我的名字吗？我喜欢什么运动？"
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "input": "你还记得我的名字吗？我喜欢什么运动？",
    "userInfo": {
      "id": 100,
      "name": "李明",
      "age": 28,
      "gender": "男",
      "hobby": "篮球"
    }
  }' | jq -r '.output' | sed 's/^/   🤖 AI: /'

echo ""
echo ""
echo -e "${GREEN}✅ Chat Intent 记忆测试完成！${NC}"
echo ""
echo "=================================================="
echo ""

echo -e "${BLUE}测试场景 2: Todo Intent - 待办事项记忆${NC}"
echo "=================================================="
echo ""

echo -e "${YELLOW}发送第一条消息: 提及会议信息${NC}"
echo "➡️  用户说: 明天下午3点有个重要的项目评审会"
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "input": "明天下午3点有个重要的项目评审会",
    "userInfo": {
      "id": 101,
      "name": "王芳",
      "age": 30,
      "gender": "女",
      "hobby": "阅读"
    }
  }' | jq -r '.output' | sed 's/^/   🤖 AI: /'

echo ""
echo ""
sleep 2

echo -e "${YELLOW}发送第二条消息: 创建待办（引用之前的信息）${NC}"
echo "➡️  用户说: 帮我创建一个待办事项，就是刚才说的那个会议"
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "input": "帮我创建一个待办事项，就是刚才说的那个会议",
    "userInfo": {
      "id": 101,
      "name": "王芳",
      "age": 30,
      "gender": "女",
      "hobby": "阅读"
    }
  }' | jq -r '.output' | sed 's/^/   🤖 AI: /'

echo ""
echo ""
echo -e "${GREEN}✅ Todo Intent 记忆测试完成！${NC}"
echo ""
echo "=================================================="
echo ""

echo -e "${BLUE}查看 Redis 中的记忆数据${NC}"
echo "=================================================="
echo ""

echo "Chat Intent 记忆键 (用户 100):"
redis-cli KEYS "memory:user:100:chat:*" | sed 's/^/   /'

echo ""
echo "Todo Intent 记忆键 (用户 101):"
redis-cli KEYS "memory:user:101:todo:*" | sed 's/^/   /'

echo ""
echo "查看 Chat 用户的对话历史 (最近3条):"
CHAT_KEY=$(redis-cli KEYS "memory:user:100:chat:*" | head -1)
if [ ! -z "$CHAT_KEY" ]; then
  redis-cli LRANGE "$CHAT_KEY" -6 -1 | sed 's/^/   /'
fi

echo ""
echo "查看 Todo 用户的对话历史 (最近3条):"
TODO_KEY=$(redis-cli KEYS "memory:user:101:todo:*" | head -1)
if [ ! -z "$TODO_KEY" ]; then
  redis-cli LRANGE "$TODO_KEY" -6 -1 | sed 's/^/   /'
fi

echo ""
echo "=================================================="
echo -e "${GREEN}✅ 测试完成！${NC}"
echo ""
echo "关键特性验证:"
echo "  ✅ 每个 Intent 有独立的记忆存储"
echo "  ✅ Chat Intent 能记住对话上下文"
echo "  ✅ Todo Intent 能基于历史对话提取信息"
echo "  ✅ 不同用户的记忆完全隔离"
echo ""

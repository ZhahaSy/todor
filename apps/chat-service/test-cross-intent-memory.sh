#!/bin/bash

# 测试跨意图记忆共享功能
# 场景：先进行 chat 对话，然后创建 todo，验证 todo 能否访问 chat 的历史记录

BASE_URL="http://localhost:3000"
API_ENDPOINT="${BASE_URL}/ai/process"

echo "=========================================="
echo "测试场景：跨意图记忆共享"
echo "=========================================="
echo ""

# 测试用户信息
USER_JSON='{
  "id": "test-user-123",
  "name": "测试用户",
  "age": 25,
  "gender": "male",
  "hobby": "编程"
}'

echo "步骤 1: 发送 chat 意图 - 询问技术问题"
echo "----------------------------------------"
CHAT_INPUT="如何实现 Redis 分布式锁？最好能用 Lua 脚本实现原子性操作"

CHAT_RESPONSE=$(curl -s -X POST "${API_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d "{
    \"input\": \"${CHAT_INPUT}\",
    \"userInfo\": ${USER_JSON}
  }")

echo "用户输入: ${CHAT_INPUT}"
echo "AI 回复:"
echo "${CHAT_RESPONSE}" | jq -r '.output' 2>/dev/null || echo "${CHAT_RESPONSE}"
echo ""
echo "识别意图:"
echo "${CHAT_RESPONSE}" | jq -r '.intent' 2>/dev/null || echo "无法解析"
echo ""
sleep 2

echo "步骤 2: 发送 todo 意图 - 基于之前的对话创建待办"
echo "----------------------------------------"
TODO_INPUT="帮我把最近聊的技术内容整理成一个待办任务，我想学习这个"

TODO_RESPONSE=$(curl -s -X POST "${API_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d "{
    \"input\": \"${TODO_INPUT}\",
    \"userInfo\": ${USER_JSON}
  }")

echo "用户输入: ${TODO_INPUT}"
echo "AI 回复:"
echo "${TODO_RESPONSE}" | jq -r '.output' 2>/dev/null || echo "${TODO_RESPONSE}"
echo ""
echo "识别意图:"
echo "${TODO_RESPONSE}" | jq -r '.intent' 2>/dev/null || echo "无法解析"
echo ""
echo "待办数据:"
echo "${TODO_RESPONSE}" | jq '.data' 2>/dev/null || echo "无法解析"
echo ""

echo "=========================================="
echo "验证结果"
echo "=========================================="
echo ""

# 检查待办标题是否包含 Redis 相关内容
TITLE=$(echo "${TODO_RESPONSE}" | jq -r '.data.title' 2>/dev/null)
if echo "${TITLE}" | grep -iq "redis\|分布式锁\|lua"; then
    echo "✅ 成功：待办标题包含了之前聊天的内容"
    echo "   标题: ${TITLE}"
else
    echo "❌ 失败：待办标题未能提取之前聊天的内容"
    echo "   标题: ${TITLE}"
    echo "   期望包含: Redis、分布式锁或Lua相关内容"
fi
echo ""

# 检查待办内容
CONTENT=$(echo "${TODO_RESPONSE}" | jq -r '.data.content' 2>/dev/null)
if echo "${CONTENT}" | grep -iq "redis\|分布式锁\|lua\|原子"; then
    echo "✅ 成功：待办内容包含了技术细节"
    echo "   内容: ${CONTENT}"
else
    echo "❌ 失败：待办内容未能提取技术细节"
    echo "   内容: ${CONTENT}"
fi
echo ""

# 检查待办类型
TYPE=$(echo "${TODO_RESPONSE}" | jq -r '.data.type' 2>/dev/null)
if [ "${TYPE}" == "study" ] || [ "${TYPE}" == "work" ]; then
    echo "✅ 成功：待办类型正确识别为学习或工作"
    echo "   类型: ${TYPE}"
else
    echo "⚠️  警告：待办类型不是学习或工作类型"
    echo "   类型: ${TYPE}"
fi
echo ""

echo "=========================================="
echo "测试完成"
echo "=========================================="

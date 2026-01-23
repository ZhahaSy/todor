#!/bin/bash

# Test script to verify Redis memory implementation
echo "🧪 Testing Redis + BufferWindowMemory Implementation"
echo "=================================================="
echo ""

# Check if Redis is running
echo "1️⃣ Checking Redis connection..."
if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is running"
else
    echo "❌ Redis is not running. Please start Redis first."
    exit 1
fi

echo ""
echo "2️⃣ Current memory keys in Redis:"
redis-cli KEYS "memory:*" | sed 's/^/   /'

echo ""
echo "3️⃣ Redis connection info:"
redis-cli INFO server | grep "redis_version" | sed 's/^/   /'

echo ""
echo "=================================================="
echo "✅ Setup verification complete!"
echo ""
echo "To test the memory system:"
echo "1. Make a POST request to http://localhost:3001/ai/message"
echo "2. Check Redis keys with: redis-cli KEYS 'memory:*'"
echo "3. View specific memory with: redis-cli LRANGE memory:user:{userId}:history 0 -1"
echo ""

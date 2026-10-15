#!/bin/bash

SENTINEL_KEY="SENTINEL_TEST_KEY_XYZ123_DO_NOT_COMMIT"

echo "=== 哨兵密钥泄露检查 ==="
echo ""
echo "1. 使用哨兵密钥构建..."

# 临时设置哨兵密钥
export AMPLITUDE_API_KEY="$SENTINEL_KEY"

# 构建
pnpm build:next > /dev/null 2>&1

echo "2. 检查构建产物..."

# 在构建产物中搜索哨兵密钥
if grep -r "$SENTINEL_KEY" .next/ .open-next/ 2>/dev/null | grep -v "process.env"; then
  echo "❌ 发现密钥泄露！"
  exit 1
else
  echo "✅ 未发现密钥泄露"
fi

echo ""
echo "3. 检查构建产物中的敏感模式..."

# 检查是否有硬编码的 API key 模式
if grep -rE "(api_key|apiKey|API_KEY).*['\"][\w-]{20,}['\"]" .next/ .open-next/ 2>/dev/null; then
  echo "⚠️  发现可疑的硬编码密钥模式"
else
  echo "✅ 无可疑硬编码密钥"
fi

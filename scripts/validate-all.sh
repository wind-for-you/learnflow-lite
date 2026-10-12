#!/bin/bash
set -e

echo "=== Learnflow Lite 完整验收脚本 ==="
echo ""

# 创建 artifacts 目录
mkdir -p artifacts/{screenshots,videos,reports}

# 1. 构建
echo "1. 构建项目..."
pnpm build

# 2. 启动服务器
echo "2. 启动 Next.js 服务器..."
pnpm start &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"

# 等待服务器就绪
for i in {1..30}; do
  if curl -s http://localhost:3000 > /dev/null; then
    echo "服务器就绪"
    break
  fi
  echo "等待服务器启动... ($i/30)"
  sleep 2
done

# 3. 运行 E2E 测试
echo "3. 运行 Playwright E2E 测试..."
pnpm test:e2e

# 4. 运行 Lighthouse
echo "4. 运行 Lighthouse 性能测试..."
npx lighthouse http://localhost:3000 \
  --output=json \
  --output=html \
  --output-path=./artifacts/reports/lighthouse \
  --chrome-flags="--headless" \
  --only-categories=performance,accessibility \
  --emulated-form-factor=mobile

# 5. 首屏请求域名检查
echo "5. 检查首屏请求域名..."
node scripts/check-requests.mjs > artifacts/reports/network-requests.txt

# 6. Wrangler dry-run
echo "6. 运行 wrangler deploy --dry-run..."
pnpm deploy:dry > artifacts/reports/wrangler-dry-run.txt 2>&1 || true

# 7. 哨兵密钥检查
echo "7. 哨兵密钥泄露检查..."
bash scripts/check-secrets.sh > artifacts/reports/secret-check.txt

# 清理
kill $SERVER_PID 2>/dev/null || true

echo ""
echo "=== 验收完成 ==="
echo "结果保存在 artifacts/ 目录"

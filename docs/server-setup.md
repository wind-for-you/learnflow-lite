# LearnFlow Lite - 服务端设置指南

## 概述

LearnFlow Lite 服务端运行在 Cloudflare Workers 上,使用 D1 数据库存储数据,通过 OpenAI 兼容的 LLM API 生成个性化学习计划。

## 技术栈

- **运行时**: Cloudflare Workers (Edge Runtime)
- **数据库**: Cloudflare D1 (SQLite)
- **LLM**: 阿里云 DashScope (或任何 OpenAI 兼容 API)
- **框架**: Next.js App Router with OpenNext adapter

## 依赖项

服务端需要以下 npm 包(需要添加到前端 scaffold 的 package.json):

```json
{
  "dependencies": {
    "@cloudflare/workers-types": "^4.20241127.0"
  },
  "devDependencies": {
    "vitest": "^1.6.0",
    "@vitest/coverage-v8": "^1.6.0"
  }
}
```

## 数据库设置

### 1. 创建 D1 数据库

```bash
# 创建数据库
wrangler d1 create learnflow-lite

# 记录返回的 database_id,需要配置到 wrangler.toml
```

### 2. 应用迁移

```bash
# 应用初始 schema
wrangler d1 execute learnflow-lite --file=./migrations/0001_init.sql
```

### 3. 验证数据库

```bash
# 查看表结构
wrangler d1 execute learnflow-lite --command "SELECT name FROM sqlite_master WHERE type='table'"

# 查看 rate_limit_counters 表
wrangler d1 execute learnflow-lite --command "SELECT * FROM rate_limit_counters LIMIT 5"

# 查看 waitlist 表
wrangler d1 execute learnflow-lite --command "SELECT * FROM waitlist LIMIT 5"
```

## Wrangler 配置

在 `wrangler.toml` 中添加以下配置:

```toml
name = "learnflow-lite"
compatibility_date = "2024-10-12"

# D1 数据库绑定
[[d1_databases]]
binding = "DB"
database_name = "learnflow-lite"
database_id = "your-database-id-here"  # 替换为实际的 database_id

# 环境变量(敏感信息使用 secrets)
[vars]
LLM_MODEL = "qwen-plus"
RATE_LIMIT_PER_DEVICE_PER_DAY = "3"
RATE_LIMIT_PER_IP_PER_DAY = "10"
```

## 环境变量和 Secrets

### 必需的 Secrets

使用 `wrangler secret put` 设置敏感信息:

```bash
# LLM API 基础 URL
wrangler secret put LLM_BASE_URL
# 输入: https://dashscope.aliyuncs.com/compatible-mode/v1

# LLM API 密钥
wrangler secret put LLM_API_KEY
# 输入: sk-your-api-key-here
```

### 可选的环境变量

在 `wrangler.toml` 的 `[vars]` 部分设置(已包含在上面的配置中):

- `LLM_MODEL`: LLM 模型名称,默认 `qwen-plus`
- `RATE_LIMIT_PER_DEVICE_PER_DAY`: 每设备每天请求限制,默认 `3`
- `RATE_LIMIT_PER_IP_PER_DAY`: 每 IP 每天请求限制,默认 `10`

## LLM 提供商配置

### 阿里云 DashScope (推荐)

```bash
# Base URL
https://dashscope.aliyuncs.com/compatible-mode/v1

# 可用模型
qwen-plus
qwen-max
qwen-turbo
```

注册地址: https://dashscope.console.aliyun.com/

### OpenRouter (备选)

```bash
# Base URL
https://openrouter.ai/api/v1

# 示例模型
anthropic/claude-3.5-sonnet
openai/gpt-4-turbo
```

注册地址: https://openrouter.ai/

### OpenAI

```bash
# Base URL
https://api.openai.com/v1

# 模型
gpt-4-turbo
gpt-3.5-turbo
```

## 测试

### 运行单元测试

```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 监听模式
npm run test:watch
```

### 测试覆盖的内容

- ✅ 输入验证 (PlanRequest, WaitlistRequest, WeekData)
- ✅ 速率限制逻辑 (设备限制、IP 限制、计数器)
- ✅ NDJSON 行解析和验证
- ✅ 部分失败时的模板兜底
- ✅ LLM 错误处理

## 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 启动本地开发服务器

```bash
# Next.js dev server with Wrangler
npm run dev
```

### 3. 使用本地 D1 数据库

```bash
# 创建本地 D1 数据库
wrangler d1 execute learnflow-lite --local --file=./migrations/0001_init.sql

# 查询本地数据库
wrangler d1 execute learnflow-lite --local --command "SELECT * FROM waitlist"
```

## 部署

### 1. 检查 bundle 大小

```bash
# 构建并检查大小(免费版限制 ~3MB 压缩后)
npm run build
wrangler deploy --dry-run

# 查看构建产物大小
ls -lh .next/standalone
```

### 2. 部署到 Cloudflare

```bash
# 部署到生产环境
wrangler deploy

# 部署到预览环境
wrangler deploy --env preview
```

### 3. 验证部署

```bash
# 查看部署日志
wrangler tail

# 测试 API 端点
curl -X POST https://your-domain.com/api/waitlist \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","deviceId":"test-device"}'
```

## 监控和维护

### 查看实时日志

```bash
wrangler tail
```

### 导出数据

```bash
# 导出所有等候名单
wrangler d1 execute learnflow-lite --command "SELECT * FROM waitlist ORDER BY created_at DESC"

# 导出为 JSON
wrangler d1 execute learnflow-lite --json --command "SELECT email, feedback, datetime(created_at, 'unixepoch') as created_at FROM waitlist"

# 统计数据
wrangler d1 execute learnflow-lite --command "SELECT COUNT(*) as total, COUNT(email) as with_email, COUNT(feedback) as with_feedback FROM waitlist"

# 导出速率限制数据(用于调试)
wrangler d1 execute learnflow-lite --command "SELECT * FROM rate_limit_counters WHERE date = date('now', '+8 hours') ORDER BY count DESC LIMIT 10"
```

### 清理旧数据

```bash
# 清理 7 天前的速率限制计数器
wrangler d1 execute learnflow-lite --command "DELETE FROM rate_limit_counters WHERE date < date('now', '-7 days')"
```

### 监控指标

在 Cloudflare Dashboard 查看:
- 请求数量和错误率
- Worker CPU 时间
- D1 查询次数
- 出站请求(到 LLM API)

## 故障排除

### 问题: LLM API 超时

**解决方案:**
- 检查 `LLM_BASE_URL` 和 `LLM_API_KEY` 是否正确
- 确认 API 配额未超限
- 尝试减小生成的周数

### 问题: 速率限制不生效

**解决方案:**
- 检查 D1 数据库是否正确绑定
- 验证迁移是否成功应用
- 查看 Worker 日志排查错误

### 问题: 部署后 API 返回 500

**解决方案:**
- 使用 `wrangler tail` 查看实时错误日志
- 检查所有环境变量是否正确设置
- 确认 D1 数据库在生产环境中已创建

### 问题: Bundle 大小超限

**解决方案:**
- 移除未使用的依赖
- 使用动态导入拆分代码
- 考虑升级到 Cloudflare Workers Paid Plan

## API 文档

详细的 API 契约文档请参考: [api-contract.md](./api-contract.md)

## 项目结构

```
learnflow-lite/
├── app/
│   └── api/
│       ├── plan/
│       │   └── route.ts           # 生成学习计划 API
│       └── waitlist/
│           └── route.ts           # 等候名单/反馈 API
├── lib/
│   └── server/
│       ├── types.ts               # TypeScript 类型定义
│       ├── validation/
│       │   └── index.ts           # 输入验证
│       ├── ratelimit/
│       │   └── index.ts           # 速率限制
│       └── llm/
│           ├── client.ts          # LLM 客户端
│           └── plan-generator.ts  # 计划生成器
├── config/
│   └── tracks/
│       └── server/
│           ├── index.ts           # Track 配置导出
│           └── tech-self-taught.ts # 技术自学轨道
├── migrations/
│   └── 0001_init.sql              # 数据库初始化
├── tests/
│   ├── validation.test.ts         # 验证测试
│   ├── ratelimit.test.ts          # 速率限制测试
│   └── plan-generator.test.ts    # 计划生成测试
└── docs/
    ├── api-contract.md            # API 契约文档
    └── server-setup.md            # 本文档
```

## 性能优化

### 1. 缓存策略

考虑为模板计划添加缓存:
- 使用 Cloudflare KV 存储常见的计划模板
- 减少对 LLM API 的调用次数

### 2. 数据库优化

- 定期清理旧的速率限制计数器
- 为高频查询添加适当的索引

### 3. LLM 调用优化

- 调整 prompt 长度,减少 token 消耗
- 考虑使用更快的模型(如 qwen-turbo)
- 实现请求队列,避免并发过高

## 安全建议

1. **永远不要在客户端暴露 LLM API 密钥**
2. **使用速率限制防止滥用**
3. **验证所有用户输入**
4. **定期审查日志,发现异常行为**
5. **设置 CORS 策略,限制允许的域名**
6. **考虑添加 CAPTCHA 防止机器人滥用**

## 成本估算

基于 Cloudflare Workers 免费套餐:
- Workers 请求: 100,000 次/天
- Workers CPU 时间: 10ms/请求
- D1 数据库: 5GB 存储 + 500万次读取/天

预计可支撑:
- ~1,000 活跃用户/天
- ~3,000 计划生成请求/天
- ~10,000 等候名单提交/天

LLM API 成本(阿里云 DashScope qwen-plus):
- 输入: ¥0.004/1000 tokens
- 输出: ¥0.012/1000 tokens
- 预计单次生成成本: ¥0.05-0.15

## 联系和支持

如有问题,请参考:
- API 文档: [api-contract.md](./api-contract.md)
- Cloudflare Workers 文档: https://developers.cloudflare.com/workers/
- Cloudflare D1 文档: https://developers.cloudflare.com/d1/
- 阿里云 DashScope 文档: https://help.aliyun.com/zh/dashscope/

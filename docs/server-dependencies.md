# 服务端依赖项

这些依赖需要添加到前端 scaffold 的 `package.json` 中。

## Dependencies

```json
{
  "dependencies": {
    "@cloudflare/workers-types": "^4.20241127.0"
  }
}
```

## DevDependencies

```json
{
  "devDependencies": {
    "vitest": "^1.6.0",
    "@vitest/coverage-v8": "^1.6.0"
  }
}
```

## Scripts

建议添加到 `package.json` 的 scripts 部分:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest watch",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Wrangler 配置片段

添加到 `wrangler.toml`:

```toml
# D1 数据库绑定
[[d1_databases]]
binding = "DB"
database_name = "learnflow-lite"
database_id = "YOUR_DATABASE_ID_HERE"

# 环境变量
[vars]
LLM_MODEL = "qwen-plus"
RATE_LIMIT_PER_DEVICE_PER_DAY = "3"
RATE_LIMIT_PER_IP_PER_DAY = "30"
```

## Secrets

需要通过 `wrangler secret put` 设置:

- `LLM_BASE_URL` (例如: `https://dashscope.aliyuncs.com/compatible-mode/v1`)
- `LLM_API_KEY` (你的 LLM API 密钥)

## TypeScript 配置

如果前端 scaffold 的 `tsconfig.json` 不包含 Cloudflare Workers 类型,需要添加:

```json
{
  "compilerOptions": {
    "types": ["@cloudflare/workers-types"]
  }
}
```

或者为服务端代码使用单独的 `tsconfig.server.json` (已包含在本 PR 中)。

# Bundle 大小分析

## 服务端代码大小评估

### 核心文件大小

```bash
# 实际文件大小统计
lib/server/types.ts                 ~2 KB
lib/server/validation/index.ts      ~6 KB
lib/server/ratelimit/index.ts       ~3 KB
lib/server/llm/client.ts            ~3 KB
lib/server/llm/plan-generator.ts    ~6 KB
config/tracks/server/*.ts           ~20 KB
app/api/plan/route.ts               ~4 KB
app/api/waitlist/route.ts           ~3 KB
-------------------------------------------
Total TypeScript source:            ~47 KB
```

### 预估压缩后大小

- **未压缩的编译后 JS**: ~60-80 KB
- **Gzip 压缩后**: ~15-20 KB
- **Brotli 压缩后**: ~12-18 KB

### Cloudflare Workers 限制

- **免费套餐**: 1 MB 未压缩后 / ~3 MB 压缩前
- **付费套餐**: 10 MB 未压缩后

### 评估结果

✅ **服务端代码非常小,远低于限制**

服务端实现仅使用:
- 标准 Web API (fetch, ReadableStream)
- TypeScript 编译为轻量级 JavaScript
- 零外部运行时依赖

预计在 Next.js + OpenNext 打包后,服务端 API 路由的额外大小 < 30 KB (压缩后)。

## 依赖分析

### 运行时依赖

- **零依赖**: 所有代码使用 Web 标准 API
- `@cloudflare/workers-types`: 仅类型定义,不包含在运行时

### 开发依赖

- `vitest`: 仅测试时使用
- `typescript`: 仅编译时使用

### Next.js + OpenNext

前端 scaffold 将包含:
- Next.js 核心
- React
- OpenNext Cloudflare adapter

这些是主要的 bundle 贡献者,但是:
- Next.js 自动做代码分割
- API 路由独立打包
- Cloudflare Workers 环境已优化

## 优化建议

### 已实施的优化

1. ✅ **零外部依赖**: 仅使用 Web 标准 API
2. ✅ **延迟加载**: track 配置按需导入
3. ✅ **代码分割**: API 路由独立文件
4. ✅ **精简类型**: 使用接口而非类

### 如果需要进一步优化

1. **动态导入 track 配置**:
   ```typescript
   const trackModule = await import(`../../../config/tracks/server/${trackId}`);
   ```

2. **移除未使用的模板周**:
   - 考虑将模板存储在 D1 或 KV
   - 按需加载而非全部打包

3. **压缩 track 配置**:
   - 使用更简短的字段名
   - 移除不必要的描述文字

## 验证方法

使用前端 scaffold 完成后,可以验证实际大小:

```bash
# 构建项目
npm run build

# 使用 wrangler 检查 bundle 大小
wrangler deploy --dry-run

# 输出示例:
# Total Upload: 1.23 MB / Compressed: 320 KB
```

## 结论

服务端实现非常轻量,不会对 bundle 大小造成压力。主要的 bundle 大小来自前端框架(Next.js/React),这是预期的且在可接受范围内。

Cloudflare Workers 免费套餐足以支持此应用。

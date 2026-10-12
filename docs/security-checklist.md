# 安全检查清单

## 检查 Build 产物中无 Secrets

### 命令(用于 CI)

```bash
# 1. 设置 sentinel 值用于测试
export LLM_API_KEY="SENTINEL_LLM_KEY_12345"
export LLM_BASE_URL="https://sentinel-llm-base.example"
export AMPLITUDE_API_KEY="SENTINEL_AMP_KEY_67890"

# 2. 构建项目
pnpm build

# 3. 检查构建产物
if [ ! -d ".open-next" ] && [ ! -d ".worker-next" ]; then
  echo "❌ 错误: 构建产物目录不存在"
  exit 1
fi

# 4. 搜索 sentinel 值
if grep -r "SENTINEL_LLM_KEY_12345" .open-next/ .worker-next/ 2>/dev/null | grep -v "process.env"; then
  echo "❌ 发现 LLM_API_KEY 泄露"
  exit 1
fi

if grep -r "SENTINEL_AMP_KEY_67890" .open-next/ .worker-next/ 2>/dev/null | grep -v "process.env"; then
  echo "❌ 发现 AMPLITUDE_API_KEY 泄露"
  exit 1
fi

if grep -r "sentinel-llm-base.example" .open-next/ .worker-next/ 2>/dev/null | grep -v "process.env"; then
  echo "❌ 发现 LLM_BASE_URL 泄露"
  exit 1
fi

echo "✅ 未发现密钥泄露"
```

### CI 集成

此检查已集成到 `.github/workflows/ci.yml` 的「构建检查」job:

```yaml
- name: 检查是否泄露密钥
  run: |
    # 设置 sentinel 值
    export LLM_API_KEY="SENTINEL_LLM_KEY_TEST"
    export LLM_BASE_URL="https://sentinel-base.test"
    
    # 构建(已在前一步完成)
    # 搜索 sentinel
    if grep -r "SENTINEL_LLM_KEY" .worker-next/ .open-next/ 2>/dev/null | grep -v "process.env"; then
      echo "❌ 构建产物中发现 LLM 密钥泄露"
      exit 1
    fi
    echo "✅ 未发现密钥泄露"
```

### 预期输出

- 构建产物目录必须存在
- Sentinel 值不应出现在构建产物中(除了 `process.env` 引用)
- 所有检查通过输出 "✅ 未发现密钥泄露"

### 已验证的安全实践

1. **环境变量正确使用**: 
   - ✅ `LLM_API_KEY` 仅通过 `env.LLM_API_KEY` 访问
   - ✅ `LLM_BASE_URL` 仅通过 `env.LLM_BASE_URL` 访问
   - ✅ 永不硬编码在源代码中

2. **Cloudflare Secrets**:
   - ✅ 使用 `wrangler secret put` 设置敏感值
   - ✅ Secrets 不包含在 wrangler.toml 中
   - ✅ Secrets 不提交到 git

3. **客户端代码分离**:
   - ✅ LLM 调用仅在服务端 (Edge Runtime)
   - ✅ API keys 永不暴露给浏览器
   - ✅ 客户端通过 `/api/*` 端点间接访问

## 检查源代码中无硬编码 Secrets

```bash
# 搜索常见的 secret 模式
grep -r "sk-" lib/ app/ config/ --include="*.ts" || echo "✅ No sk- patterns"
grep -r "api_key\s*=\s*['\"]" lib/ app/ config/ --include="*.ts" || echo "✅ No hardcoded api_key"
grep -r "apiKey\s*=\s*['\"]" lib/ app/ config/ --include="*.ts" || echo "✅ No hardcoded apiKey"

# 检查是否正确使用环境变量
echo "\n📋 Environment variable usage:"
grep -r "env\." lib/ app/ --include="*.ts" | grep -E "LLM|API" | head -10
```

### 预期输出示例

```
✅ No sk- patterns
✅ No hardcoded api_key
✅ No hardcoded apiKey

📋 Environment variable usage:
lib/server/llm/client.ts:    this.baseURL = env.LLM_BASE_URL;
lib/server/llm/client.ts:    this.apiKey = env.LLM_API_KEY;
lib/server/llm/client.ts:    this.model = env.LLM_MODEL || 'qwen-plus';
```

## Git History 检查

```bash
# 确保历史记录中没有提交过 secrets
git log --all --oneline --decorate | head -20
git log --all -S "sk-" --oneline || echo "✅ No sk- in git history"
git log --all -S "api_key" --oneline | grep -v "env.LLM_API_KEY" || echo "✅ No hardcoded api_key in history"
```

## .gitignore 覆盖

验证 `.gitignore` 正确排除敏感文件:

```bash
cat .gitignore | grep -E "\.env|\.dev\.vars|wrangler\.toml\.local"
```

预期输出:
```
.env
.env.local
.env.*.local
.dev.vars
wrangler.toml.local
```

## Wrangler 配置检查

```bash
# 确保 wrangler.toml 不包含 secrets
if [ -f wrangler.toml ]; then
  grep -E "api_key|API_KEY|secret" wrangler.toml || echo "✅ No secrets in wrangler.toml"
else
  echo "⚠️  wrangler.toml not found (will be added by frontend scaffold)"
fi
```

## 部署前最终检查

```bash
# 1. 类型检查
npm run typecheck

# 2. 测试
npm test

# 3. 检查 bundle (需要完整项目)
# wrangler deploy --dry-run

# 4. 搜索所有文件中的潜在 secrets
find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.json" \) \
  ! -path "./node_modules/*" \
  ! -path "./.git/*" \
  -exec grep -l "sk-[a-zA-Z0-9]\{20,\}" {} \; || echo "✅ No secrets in source files"
```

## 紧急响应

如果发现 secret 被意外提交:

1. **立即轮换 secret**:
   ```bash
   # 在 Cloudflare dashboard 或 provider 处重新生成 API key
   wrangler secret put LLM_API_KEY
   # 输入新的 key
   ```

2. **从 git 历史中移除** (如果已推送):
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch path/to/file" \
     --prune-empty --tag-name-filter cat -- --all
   
   git push origin --force --all
   ```

3. **通知团队**: 确保所有人知道旧 key 已失效

## 最佳实践总结

- ✅ Secrets 仅通过环境变量注入
- ✅ 使用 Cloudflare Secrets 管理敏感值
- ✅ 定期轮换 API keys
- ✅ 审查所有 PR 中的环境变量使用
- ✅ 部署前运行安全检查脚本
- ✅ 启用 secret scanning (GitHub/GitLab)
- ✅ 记录所有 secret 的用途和所有者

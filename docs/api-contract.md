# API 契约文档 (plan schema v2)

权威 schema 定义见 `lib/shared/plan.ts`(zod),`PLAN_SCHEMA_VERSION = 2`。

## 1. POST /api/plan - 生成学习计划

### 请求体

```json
{
  "trackId": "tech-self-taught",
  "answers": {
    "currentLevel": "完全零基础",
    "targetRole": "前端工程师",
    "weeklyHours": 10,
    "deadline": "6个月",
    "biggestBlocker": "不知道从哪里开始"
  },
  "deviceId": "unique-device-identifier",
  "weeks": [0, 1, 2],
  "keptWeeks": [{ "index": 3, "title": "React 入门" }]
}
```

- `trackId` (必需): 已知轨道 ID
- `answers` (必需): 字符串答案,每个最长 2000 字符;**必须包含 `weeklyHours: number`**,取值 `5 | 10 | 15 | 20`(`20` 表示 20+ 小时)
- `deviceId` (必需): 最长 100 字符
- **周数取决于 `weeklyHours`**:`10/15/20` → 12 周模板(每周 ≤ 10h);`5` → 23 周拆分模板(每周 ≤ 5h)。服务端按 weeklyHours 确定性选择模板,AI 生成的总周数与兜底模板周数一致;`weeks` 中超出该档位周数的索引会被忽略
- `weeks` (可选): 需重新生成的周索引(非负整数)
- `keptWeeks` (可选): 保留周 `{ index, title }`

### 响应:`application/x-ndjson`,每行一个 JSON

#### week 行

```json
{
  "type": "week",
  "index": 0,
  "source": "ai",
  "data": {
    "title": "第一个网页上线",
    "deliverable": "部署一个个人介绍单页到 GitHub Pages 并提交链接",
    "doneCriteria": ["页面可公开访问", "包含自我介绍与联系方式"],
    "submitFields": ["link"],
    "estimateHours": 6,
    "firstStep": { "action": "注册 GitHub 并新建仓库", "minutes": 15 },
    "resources": [{ "title": "MDN HTML", "url": "https://developer.mozilla.org/zh-CN/docs/Learn/HTML" }]
  }
}
```

`data` 为 `PlanWeekData`:

| 字段 | 类型 | 约束 |
|---|---|---|
| `title` | string | 1–30 |
| `deliverable` | string | 8–120,具体可检查的产出 |
| `doneCriteria` | string[] | 1–3 条,每条 4–80 |
| `submitFields` | (`text`\|`link`\|`number`)[] | ≥1 |
| `estimateHours` | int | 1–40 |
| `firstStep` | `{ action: string(4–60), minutes: int(5–30) }` | 可选(见服务端规则) |
| `resources` | `{ title, url }[]` | 可选,≤3 |

v1 的 `milestone`、`tasks`、`acceptanceCriteria` 等字段**已移除**;`title`、`resources` 保留。

#### done 行
`{ "type": "done", "fallbackWeeks": [5, 8] }`

#### error 行
`{ "type": "error", "message": "LLM API error: 503", "fallbackWeeks": [2, 3] }`

`source: "template"` 表示该周校验失败,已用模板兜底。

### 服务端校验规则(仅服务端执行,超出 zod schema)

- 第 1 周(`index = 0`)必须有 `firstStep`
- `estimateHours <= answers.weeklyHours`
- `vague_deliverable`:deliverable 仅包含"理解/了解/掌握/熟悉"之类词语、没有具体产出物

### 拒绝原因 `WeekRejectReason`

`missing_deliverable`, `missing_done_criteria`, `vague_deliverable`, `bad_estimate`, `over_budget`, `missing_first_step`, `json_parse`

被拒绝时服务端记录结构化日志:
`{"event":"week_rejected","weekIndex":0,"reason":"over_budget","model":"qwen-plus"}`

### 速率限制

**限制规则:**

- 每个设备每天最多 3 次请求(重新生成也计数)
- 每个 IP 每天最多 10 次请求
- 日期基于 Asia/Shanghai 时区

**响应头:**

- `X-RateLimit-Remaining`: 剩余请求次数
- `X-RateLimit-Reset`: 限制重置时间(ISO 8601 格式)

**超出限制响应:**

```json
{
  "error": "Rate limit exceeded",
  "remaining": 0,
  "resetAt": "2026-10-13T00:00:00.000Z"
}
```

**状态码:** `429 Too Many Requests`

### 错误响应

#### 400 Bad Request

```json
{
  "error": "trackId is required and must be a string"
}
```

```json
{
  "error": "Unknown trackId"
}
```

#### 500 Internal Server Error

```json
{
  "error": "Internal server error"
}
```

---

## 2. POST /api/waitlist - 提交反馈/加入等候名单

收集用户反馈或邮箱的简单 API。

### 请求

**方法:** `POST`  
**Content-Type:** `application/json`

**请求体:**

```json
{
  "email": "user@example.com",
  "feedback": "产品很棒,希望能添加更多轨道!",
  "deviceId": "unique-device-identifier",
  "page": "/onboarding"
}
```

**字段说明:**

- `email` (可选): 用户邮箱地址
- `feedback` (可选): 用户反馈文字
- `deviceId` (必需): 设备唯一标识符
- `page` (可选): 提交来源页面

**验证规则:**

- 至少提供 `email` 或 `feedback` 之一
- `email`: 必须是有效的邮箱格式,最大长度 254 字符
- `feedback`: 最大长度 5000 字符
- `deviceId`: 最大长度 100 字符

### 响应

**状态码:** `201 Created`

```json
{
  "success": true,
  "message": "Thank you for your submission!"
}
```

### 速率限制

- 每个 IP 每小时最多 5 次提交

**超出限制响应:**

```json
{
  "error": "Too many submissions. Please try again later."
}
```

**状态码:** `429 Too Many Requests`

### 错误响应

#### 400 Bad Request

```json
{
  "error": "At least one of email or feedback is required"
}
```

```json
{
  "error": "Invalid email format"
}
```

#### 500 Internal Server Error

```json
{
  "error": "Internal server error"
}
```

---

## 环境变量配置

服务端需要以下环境变量:

### 必需

- `LLM_BASE_URL`: LLM API 基础 URL(如 `https://dashscope.aliyuncs.com/compatible-mode/v1`)
- `LLM_API_KEY`: LLM API 密钥

### 可选

- `LLM_MODEL`: LLM 模型名称(默认: `qwen-plus`)
- `RATE_LIMIT_PER_DEVICE_PER_DAY`: 每设备每天请求限制(默认: `3`)
- `RATE_LIMIT_PER_IP_PER_DAY`: 每 IP 每天请求限制(默认: `10`)

### Cloudflare Bindings

需要在 `wrangler.toml` 中配置 D1 数据库绑定:

```toml
[[d1_databases]]
binding = "DB"
database_name = "learnflow-lite"
database_id = "your-database-id"
```

---

## 数据导出

### 导出等候名单数据

使用 Wrangler CLI 导出数据:

```bash
# 导出所有等候名单条目
wrangler d1 execute learnflow-lite --command "SELECT * FROM waitlist ORDER BY created_at DESC"

# 导出为 CSV(使用 JSON 模式)
wrangler d1 execute learnflow-lite --json --command "SELECT email, feedback, datetime(created_at, 'unixepoch') as created_at FROM waitlist WHERE email IS NOT NULL ORDER BY created_at DESC"

# 统计反馈数量
wrangler d1 execute learnflow-lite --command "SELECT COUNT(*) as total, COUNT(email) as with_email, COUNT(feedback) as with_feedback FROM waitlist"
```

---

## 集成示例

### 前端调用 /api/plan

```typescript
async function generatePlan(request: PlanRequest) {
  const response = await fetch('/api/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n').filter(Boolean);

    for (const line of lines) {
      const data = JSON.parse(line);
      
      if (data.type === 'week') {
        console.log(`Week ${data.index}:`, data.data.title);
        // 渲染周数据
      } else if (data.type === 'done') {
        console.log('Generation complete');
      } else if (data.type === 'error') {
        console.error('Generation error:', data.message);
      }
    }
  }
}
```

### 前端调用 /api/waitlist

```typescript
async function submitWaitlist(data: WaitlistRequest) {
  const response = await fetch('/api/waitlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return await response.json();
}
```

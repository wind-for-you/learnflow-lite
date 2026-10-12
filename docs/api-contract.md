# API 契约文档

## 1. POST /api/plan - 生成学习计划

生成或重新生成个性化学习计划的流式 API。

### 请求

**方法:** `POST`  
**Content-Type:** `application/json`

**请求体:**

```json
{
  "trackId": "tech-self-taught",
  "answers": {
    "currentLevel": "完全零基础",
    "targetRole": "前端工程师",
    "hoursPerWeek": "15-20小时",
    "deadline": "6个月",
    "biggestBlocker": "不知道从哪里开始"
  },
  "deviceId": "unique-device-identifier",
  "weeks": [0, 1, 2],
  "keptWeeks": [
    { "index": 3, "title": "React 入门" }
  ]
}
```

**字段说明:**

- `trackId` (必需): 学习轨道 ID,目前支持 `"tech-self-taught"`
- `answers` (必需): 用户回答的问题对象,键值对形式
- `deviceId` (必需): 设备唯一标识符,用于速率限制
- `weeks` (可选): 要重新生成的周索引数组。不提供则生成完整计划
- `keptWeeks` (可选): 保留的周信息,用于保持连贯性

**验证规则:**

- `trackId`: 必须是已知的轨道 ID
- `answers`: 每个答案最大长度 2000 字符
- `deviceId`: 最大长度 100 字符
- `weeks`: 必须是非负整数数组

### 响应

**Content-Type:** `application/x-ndjson`  
**状态码:** `200 OK`

响应是流式 NDJSON 格式,每行一个 JSON 对象。

#### NDJSON 行类型

##### 1. Week 数据行

```json
{
  "type": "week",
  "index": 0,
  "source": "ai",
  "data": {
    "title": "启程:第一个网页上线",
    "milestone": "完成并部署第一个个人网页",
    "tasks": [
      {
        "title": "30分钟做出第一个网页",
        "description": "使用 HTML 和 CSS 创建一个简单的个人介绍页面",
        "deliverable": "创建并部署一个包含个人简介的单页网站到 GitHub Pages",
        "acceptanceCriteria": [
          "页面包含个人照片或头像",
          "有清晰的自我介绍",
          "成功部署到 GitHub Pages"
        ],
        "estimatedHours": 4,
        "references": [
          {
            "title": "HTML 基础教程",
            "url": "https://developer.mozilla.org/zh-CN/docs/Learn/HTML",
            "type": "doc"
          }
        ]
      }
    ],
    "resources": [
      {
        "title": "MDN Web 文档",
        "url": "https://developer.mozilla.org/zh-CN/"
      }
    ]
  }
}
```

**字段说明:**

- `type`: 固定为 `"week"`
- `index`: 周索引,从 0 开始
- `source`: `"ai"` 表示 AI 生成,`"template"` 表示使用模板兜底
- `data.title`: 本周标题
- `data.milestone`: 本周里程碑
- `data.tasks`: 任务数组,至少包含一个具体的交付物任务
- `data.resources`: 可选的学习资源数组

##### 2. 完成行

```json
{
  "type": "done",
  "fallbackWeeks": [5, 8]
}
```

- `type`: 固定为 `"done"`
- `fallbackWeeks`: 使用模板兜底的周索引数组

##### 3. 错误行

```json
{
  "type": "error",
  "message": "LLM API error: 503",
  "fallbackWeeks": [2, 3, 4]
}
```

- `type`: 固定为 `"error"`
- `message`: 错误描述
- `fallbackWeeks`: 使用模板兜底的周索引数组

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

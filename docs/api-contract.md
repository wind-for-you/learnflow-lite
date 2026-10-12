# API 契约文档 (plan schema v2)

权威 schema 定义见 `lib/shared/plan.ts`(zod),`PLAN_SCHEMA_VERSION = 2`。

## POST /api/plan

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

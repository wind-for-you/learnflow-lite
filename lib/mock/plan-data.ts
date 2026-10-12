import type { NDJSONLine, PlanWeekData } from '@/lib/shared/plan';

export type { NDJSONLine, PlanWeekData } from '@/lib/shared/plan';

/** 一行流式消息（与服务端 NDJSON 契约一致）。 */
export type PlanMessage = NDJSONLine;

export interface PlanStreamRequest {
  trackId: string;
  answers: Record<string, string | number>;
  deviceId?: string;
  /** 需要（重新）生成的周索引。 */
  weeks?: number[];
  /** 保留不动的周。 */
  keptWeeks?: Array<{ index: number; title: string }>;
}

/** 前端模板周：AI 不可用时兜底，字段符合 PlanWeekData。 */
export const templateWeeks: PlanWeekData[] = [
  {
    title: '开发环境与第一个网页',
    deliverable: '在 GitHub Pages 上线一个个人介绍单页并提交访问链接',
    doneCriteria: ['页面可公开访问', '包含自我介绍与联系方式'],
    submitFields: ['link'],
    estimateHours: 6,
    firstStep: { action: '注册 GitHub 账号并新建一个仓库', minutes: 15 },
    resources: [{ title: 'MDN 学习 HTML', url: 'https://developer.mozilla.org/zh-CN/docs/Learn/HTML' }],
  },
  {
    title: 'JavaScript 基础练习',
    deliverable: '完成 20 道 JavaScript 基础练习题并把代码推送到仓库',
    doneCriteria: ['20 道题全部通过', '代码已推送到 GitHub'],
    submitFields: ['link', 'number'],
    estimateHours: 8,
    resources: [{ title: 'JavaScript.info', url: 'https://zh.javascript.info/' }],
  },
  {
    title: '交互式待办清单',
    deliverable: '用原生 JS 做一个可增删、可标记完成的待办清单页面',
    doneCriteria: ['能新增和删除条目', '刷新后数据仍保留'],
    submitFields: ['link'],
    estimateHours: 8,
  },
  {
    title: 'React 组件入门',
    deliverable: '用 React 重写待办清单，拆出至少 3 个组件并部署上线',
    doneCriteria: ['至少 3 个组件', '线上可访问'],
    submitFields: ['link', 'text'],
    estimateHours: 10,
    resources: [{ title: 'React 官方文档', url: 'https://react.dev/learn' }],
  },
  {
    title: '调用公开 API',
    deliverable: '做一个调用天气公开 API 的查询页面，含加载与错误状态',
    doneCriteria: ['展示加载中状态', '接口失败时有提示'],
    submitFields: ['link'],
    estimateHours: 8,
  },
  {
    title: 'TypeScript 改造',
    deliverable: '把天气查询项目改写为 TypeScript 且 tsc 无报错',
    doneCriteria: ['开启 strict 模式', 'tsc 检查零错误'],
    submitFields: ['link', 'text'],
    estimateHours: 8,
    resources: [{ title: 'TypeScript 手册', url: 'https://www.typescriptlang.org/docs/' }],
  },
  {
    title: '样式与响应式',
    deliverable: '用 Tailwind 为项目做手机与桌面两套响应式布局并截图提交',
    doneCriteria: ['375px 下无横向滚动', '桌面端布局合理'],
    submitFields: ['link', 'text'],
    estimateHours: 6,
  },
  {
    title: 'Next.js 全栈小项目',
    deliverable: '用 Next.js 做一个带 API 路由的留言板并部署上线',
    doneCriteria: ['可以提交和查看留言', '线上可访问'],
    submitFields: ['link'],
    estimateHours: 10,
  },
  {
    title: '测试与 CI',
    deliverable: '为留言板补 5 个单元测试并配置 GitHub Actions 自动运行',
    doneCriteria: ['至少 5 个测试通过', 'CI 显示绿色'],
    submitFields: ['link', 'number'],
    estimateHours: 8,
  },
  {
    title: '作品集网站',
    deliverable: '搭建个人作品集网站，展示前面完成的 3 个项目',
    doneCriteria: ['包含 3 个项目介绍', '每个项目有在线链接'],
    submitFields: ['link'],
    estimateHours: 10,
  },
  {
    title: '简历与投递',
    deliverable: '写好一页技术简历并投递 10 个前端岗位',
    doneCriteria: ['简历一页以内', '投递数量达到 10 个'],
    submitFields: ['text', 'number'],
    estimateHours: 6,
  },
  {
    title: '面试复盘',
    deliverable: '整理 30 道常见前端面试题的答案并写一篇复盘笔记',
    doneCriteria: ['30 道题都有答案', '复盘笔记已发布'],
    submitFields: ['link', 'text'],
    estimateHours: 8,
  },
];

export function getWeeklyHours(answers: Record<string, string | number>): number {
  const raw = Number(answers.weeklyHours);
  return Number.isFinite(raw) && raw > 0 ? raw : 10;
}

export function getTotalWeeks(answers: Record<string, string | number>): number {
  return Math.min(Math.max(Math.ceil(120 / getWeeklyHours(answers)), 6), 12);
}

/** 返回第 index 周的模板数据（投入时间不超过每周可用小时）。 */
export function getTemplateWeek(index: number, weeklyHours: number): PlanWeekData {
  const base = templateWeeks[index % templateWeeks.length];
  return { ...base, estimateHours: Math.max(1, Math.min(base.estimateHours, weeklyHours)) };
}

export type MockScenario = 'ok' | 'fail' | 'truncate';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function generateMockPlanStream(
  request: PlanStreamRequest,
  scenario: MockScenario = 'ok',
  stepMs = 300
): AsyncGenerator<PlanMessage, void, unknown> {
  return (async function* () {
    const weeklyHours = getWeeklyHours(request.answers);
    const total = getTotalWeeks(request.answers);
    const indices = request.weeks ?? Array.from({ length: total }, (_, i) => i);
    const isRegenerate = request.weeks !== undefined;

    if (scenario === 'fail') {
      yield { type: 'error', message: '生成失败，先用模板计划开始', fallbackWeeks: indices };
      return;
    }

    for (let i = 0; i < indices.length; i++) {
      if (scenario === 'truncate' && i >= 3) return;
      await delay(stepMs);
      const index = indices[i];
      // 初次生成时第 7 周起模拟 AI 校验失败 → 模板兜底；重新生成时全部由 AI 返回。
      const source = !isRegenerate && index >= 6 ? 'template' : 'ai';
      yield { type: 'week', index, source, data: getTemplateWeek(index, weeklyHours) };
    }

    yield {
      type: 'done',
      fallbackWeeks: isRegenerate ? [] : indices.filter((index) => index >= 6),
    };
  })();
}

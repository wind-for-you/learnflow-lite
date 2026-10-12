import type { PlanWeekData } from '../../../lib/shared/plan';

type R = { title: string; url: string };
const MDN_HTML: R = { title: 'MDN HTML 入门', url: 'https://developer.mozilla.org/zh-CN/docs/Learn/HTML' };
const GH_PAGES: R = { title: 'GitHub Pages', url: 'https://pages.github.com/' };
const JS_INFO: R = { title: 'javascript.info', url: 'https://javascript.info/' };
const VERCEL: R = { title: 'Vercel Docs', url: 'https://vercel.com/docs' };
const LOCAL_STORAGE: R = { title: 'localStorage', url: 'https://developer.mozilla.org/zh-CN/docs/Web/API/Window/localStorage' };
const TODOMVC: R = { title: 'TodoMVC', url: 'https://todomvc.com/' };
const REACT: R = { title: 'React 文档', url: 'https://react.dev/' };
const VITE: R = { title: 'Vite 指南', url: 'https://vitejs.dev/guide/' };
const OPEN_METEO: R = { title: 'Open-Meteo API', url: 'https://open-meteo.com/en/docs' };
const FETCH: R = { title: 'Fetch API', url: 'https://developer.mozilla.org/zh-CN/docs/Web/API/Fetch_API' };
const EXPRESS: R = { title: 'Express', url: 'https://expressjs.com/' };
const RENDER: R = { title: 'Render Docs', url: 'https://render.com/docs' };
const SUPABASE: R = { title: 'Supabase Docs', url: 'https://supabase.com/docs' };
const PRISMA: R = { title: 'Prisma Docs', url: 'https://www.prisma.io/docs' };
const CORS: R = { title: 'CORS', url: 'https://developer.mozilla.org/zh-CN/docs/Web/HTTP/CORS' };
const JWT: R = { title: 'JWT 介绍', url: 'https://jwt.io/introduction' };
const BCRYPT: R = { title: 'bcrypt', url: 'https://www.npmjs.com/package/bcrypt' };
const SENTRY: R = { title: 'Sentry Docs', url: 'https://docs.sentry.io/' };
const PINO: R = { title: 'Pino', url: 'https://getpino.io/' };
const VITEST: R = { title: 'Vitest', url: 'https://vitest.dev/' };
const RTL: R = { title: 'Testing Library', url: 'https://testing-library.com/docs/react-testing-library/intro/' };
const GHA: R = { title: 'GitHub Actions', url: 'https://docs.github.com/actions' };
const PORTFOLIOS: R = { title: 'Developer Portfolios', url: 'https://github.com/emmabostian/developer-portfolios' };
const NEXT: R = { title: 'Next.js Docs', url: 'https://nextjs.org/docs' };

/** 12-week plan used for weeklyHours 10 / 15 / 20 (every week <= 10h). */
export const templatePlanStandard: PlanWeekData[] = [
  {
    title: '启程:第一个网页上线',
    deliverable: '用 HTML/CSS 写个人介绍单页并部署到 GitHub Pages,提交页面链接',
    doneCriteria: ['页面通过公开 URL 可访问', '包含 50–100 字自我介绍和 3 项想学的技能', '至少一种联系方式(邮箱或社交账号)'],
    submitFields: ['link'],
    estimateHours: 4,
    firstStep: { action: '注册 GitHub 并新建名为 username.github.io 的仓库', minutes: 15 },
    resources: [MDN_HTML, GH_PAGES],
  },
  {
    title: '交互:网页计算器',
    deliverable: '用原生 JavaScript 做一个支持四则运算的网页计算器,部署到 Vercel 或 Netlify 并提交链接',
    doneCriteria: ['加减乘除和小数运算结果正确', '除以零时显示错误提示而不是崩溃', '手机和电脑宽度下布局都正常'],
    submitFields: ['link'],
    estimateHours: 8,
    resources: [JS_INFO, VERCEL],
  },
  {
    title: '数据:本地存储待办应用',
    deliverable: '做一个支持增删和完成标记的 Todo List,用 localStorage 持久化,部署后提交链接',
    doneCriteria: ['可添加、删除、切换完成状态', '刷新页面后数据不丢失', '显示待办/已完成数量统计'],
    submitFields: ['link'],
    estimateHours: 8,
    resources: [LOCAL_STORAGE, TODOMVC],
  },
  {
    title: 'React:组件化重写待办',
    deliverable: '用 Vite + React 重写第 3 周的 Todo List,至少拆成 3 个组件,部署后提交线上链接',
    doneCriteria: ['使用 useState/useEffect,至少 3 个组件', '保留增删、完成、持久化全部功能', '线上链接可正常使用'],
    submitFields: ['link'],
    estimateHours: 10,
    resources: [REACT, VITE],
  },
  {
    title: 'API:天气查询应用',
    deliverable: '做一个调用 Open-Meteo(无需 API Key)的 React 应用,按城市查询当前天气和 3 天预报,部署后提交链接',
    doneCriteria: ['输入城市名能显示温度、天气和湿度', '有加载中提示', '断网或请求失败时显示失败提示'],
    submitFields: ['link'],
    estimateHours: 8,
    resources: [OPEN_METEO, FETCH],
  },
  {
    title: '后端:笔记 REST API',
    deliverable: '用 Node.js + Express 实现笔记 CRUD 接口并部署到 Render,提交接口地址和一段 curl 调用示例',
    doneCriteria: ['GET/POST/PUT/DELETE /notes 均可调用', '非法输入返回 400 和错误信息', '线上地址可被 curl 访问'],
    submitFields: ['link', 'text'],
    estimateHours: 10,
    resources: [EXPRESS, RENDER],
  },
  {
    title: '数据库:笔记接入 PostgreSQL',
    deliverable: '把第 6 周的笔记 API 改为使用云端 PostgreSQL(如 Supabase)存储,重新部署并提交仓库链接',
    doneCriteria: ['notes 表含 id/title/content/created_at/updated_at', '所有接口读写数据库,重启服务后数据仍在', '查询使用参数化,无 SQL 拼接'],
    submitFields: ['link'],
    estimateHours: 10,
    resources: [SUPABASE, PRISMA],
  },
  {
    title: '全栈:前后端笔记应用',
    deliverable: '做 React 前端对接第 7 周 API,实现笔记增删改查与搜索,前后端都部署并提交前端链接',
    doneCriteria: ['能在页面上创建、编辑、删除和搜索笔记', 'CORS 配置正确,线上前端可调用线上后端', 'README 写明本地运行和部署步骤'],
    submitFields: ['link'],
    estimateHours: 10,
    resources: [CORS],
  },
  {
    title: '认证:用户登录与隔离',
    deliverable: '为笔记应用加入注册/登录(bcrypt + JWT),每个用户只能看到自己的笔记,部署后提交链接',
    doneCriteria: ['密码以 bcrypt 哈希存储', '未登录访问笔记接口返回 401', '用户 A 无法读取或修改用户 B 的笔记'],
    submitFields: ['link'],
    estimateHours: 10,
    resources: [JWT, BCRYPT],
  },
  {
    title: '上线:日志与错误监控',
    deliverable: '为笔记应用接入结构化日志和 Sentry 错误监控,提交仓库链接和 Sentry 中捕获到的错误链接',
    doneCriteria: ['后端每个请求输出结构化日志(Pino 或 Winston)', '故意触发的错误在 Sentry 中可见并可通过链接打开', '开发与生产环境变量分开配置'],
    submitFields: ['link'],
    estimateHours: 8,
    resources: [SENTRY, PINO],
  },
  {
    title: '测试:自动化测试与 CI',
    deliverable: '为笔记应用写至少 5 个接口测试和 2 个组件测试,配置 GitHub Actions,提交 CI 通过的 PR 链接和测试数量',
    doneCriteria: ['至少 5 个后端接口测试', '至少 2 个前端组件测试', 'PR 上 GitHub Actions 运行通过(绿色)'],
    submitFields: ['link', 'number'],
    estimateHours: 10,
    resources: [VITEST, RTL, GHA],
  },
  {
    title: '作品集:作品集网站与简历',
    deliverable: '部署个人作品集网站,放上前 11 周里的至少 5 个项目(含线上和仓库链接),附 PDF 简历下载,提交网站链接',
    doneCriteria: ['放上前 11 周里的至少 5 个项目,每个含截图、技术栈、线上和仓库链接', '页面可下载 PDF 技术简历', '手机端显示正常'],
    submitFields: ['link'],
    estimateHours: 10,
    resources: [PORTFOLIOS, NEXT],
  },
];

/** 23-week hand-written split plan for weeklyHours = 5 (every week <= 5h). */
export const templatePlan5h: PlanWeekData[] = [
  {
    title: '启程:第一个网页上线',
    deliverable: '用 HTML/CSS 写个人介绍单页并部署到 GitHub Pages,提交页面链接',
    doneCriteria: ['页面通过公开 URL 可访问', '包含 50–100 字自我介绍和 3 项想学的技能', '至少一种联系方式(邮箱或社交账号)'],
    submitFields: ['link'],
    estimateHours: 4,
    firstStep: { action: '注册 GitHub 并新建名为 username.github.io 的仓库', minutes: 15 },
    resources: [MDN_HTML, GH_PAGES],
  },
  {
    title: '交互:加减计算器上线',
    deliverable: '用原生 JavaScript 做一个能做加法和减法的网页计算器,部署到 Vercel 并提交链接',
    doneCriteria: ['整数加减结果正确', '有清空按钮', '线上链接可访问'],
    submitFields: ['link'],
    estimateHours: 4,
    resources: [JS_INFO, VERCEL],
  },
  {
    title: '交互:完整四则计算器',
    deliverable: '给计算器加上乘除、小数和除零提示,适配手机屏幕,重新部署并提交链接',
    doneCriteria: ['加减乘除和小数运算结果正确', '除以零时显示错误提示而不是崩溃', '手机和电脑宽度下布局都正常'],
    submitFields: ['link'],
    estimateHours: 4,
    resources: [JS_INFO],
  },
  {
    title: '数据:可增删的待办列表',
    deliverable: '做一个可添加和删除事项的 Todo List 页面,部署后提交链接',
    doneCriteria: ['输入后回车或点按钮可添加事项', '每条事项可删除', '线上链接可访问'],
    submitFields: ['link'],
    estimateHours: 4,
    resources: [TODOMVC],
  },
  {
    title: '数据:待办持久化与统计',
    deliverable: '给 Todo List 加完成标记、localStorage 持久化和数量统计,重新部署并提交链接',
    doneCriteria: ['可切换完成状态', '刷新页面后数据不丢失', '显示待办/已完成数量统计'],
    submitFields: ['link'],
    estimateHours: 4,
    resources: [LOCAL_STORAGE],
  },
  {
    title: 'React:第一个组件页面',
    deliverable: '用 Vite 创建 React 项目,做出一个能添加并显示事项的列表页,部署后提交链接',
    doneCriteria: ['用 useState 管理事项列表', '至少拆出输入框和列表 2 个组件', '线上链接可访问'],
    submitFields: ['link'],
    estimateHours: 5,
    resources: [VITE, REACT],
  },
  {
    title: 'React:待办功能完整版',
    deliverable: '在 React 项目里补齐删除、完成标记和 localStorage 持久化,重新部署并提交链接',
    doneCriteria: ['至少 3 个组件', '增删、完成、持久化全部可用', '用 useEffect 同步 localStorage'],
    submitFields: ['link'],
    estimateHours: 5,
    resources: [REACT],
  },
  {
    title: 'API:当前天气查询',
    deliverable: '做一个调用 Open-Meteo 的 React 页面,输入城市显示当前温度和天气,部署后提交链接',
    doneCriteria: ['输入城市名能显示当前温度和天气', '有加载中提示', '线上链接可访问'],
    submitFields: ['link'],
    estimateHours: 4,
    resources: [OPEN_METEO, FETCH],
  },
  {
    title: 'API:3 天预报与失败提示',
    deliverable: '给天气应用加上 3 天预报、湿度显示和请求失败提示,重新部署并提交链接',
    doneCriteria: ['显示未来 3 天预报', '显示湿度', '断网或请求失败时显示失败提示'],
    submitFields: ['link'],
    estimateHours: 4,
    resources: [OPEN_METEO],
  },
  {
    title: '后端:笔记读取与创建接口',
    deliverable: '用 Express 实现 GET /notes 和 POST /notes(内存存储),部署到 Render,提交接口地址和 curl 示例',
    doneCriteria: ['GET /notes 返回 JSON 列表', 'POST /notes 可创建笔记', '线上地址可被 curl 访问'],
    submitFields: ['link', 'text'],
    estimateHours: 5,
    resources: [EXPRESS, RENDER],
  },
  {
    title: '后端:笔记更新删除与校验',
    deliverable: '为笔记 API 加上 PUT/DELETE /notes/:id 和输入校验,重新部署并提交 curl 调用示例',
    doneCriteria: ['PUT 和 DELETE 可用', '非法输入返回 400 和错误信息', '不存在的 id 返回 404'],
    submitFields: ['link', 'text'],
    estimateHours: 5,
    resources: [EXPRESS],
  },
  {
    title: '数据库:建表并读取笔记',
    deliverable: '在 Supabase 建 notes 表,让 GET /notes 从数据库读取,重新部署并提交仓库链接',
    doneCriteria: ['notes 表含 id/title/content/created_at/updated_at', 'GET /notes 返回数据库里的数据', '数据库连接串通过环境变量配置'],
    submitFields: ['link'],
    estimateHours: 5,
    resources: [SUPABASE],
  },
  {
    title: '数据库:全部接口写库',
    deliverable: '把 POST/PUT/DELETE 也改为读写 PostgreSQL 并使用参数化查询,重新部署并提交仓库链接',
    doneCriteria: ['所有接口读写数据库', '重启服务后数据仍在', '查询使用参数化,无 SQL 拼接'],
    submitFields: ['link'],
    estimateHours: 5,
    resources: [PRISMA, SUPABASE],
  },
  {
    title: '全栈:前端显示笔记列表',
    deliverable: '做 React 前端调用线上笔记 API 显示列表并可新建笔记,部署前端并提交链接',
    doneCriteria: ['线上前端能显示数据库里的笔记', '可在页面新建笔记', 'CORS 配置正确'],
    submitFields: ['link'],
    estimateHours: 5,
    resources: [CORS],
  },
  {
    title: '全栈:编辑删除与搜索',
    deliverable: '给笔记前端加上编辑、删除和关键词搜索,补写 README,重新部署并提交链接',
    doneCriteria: ['能在页面编辑和删除笔记', '输入关键词可筛选笔记', 'README 写明本地运行和部署步骤'],
    submitFields: ['link'],
    estimateHours: 5,
    resources: [REACT],
  },
  {
    title: '认证:注册与登录接口',
    deliverable: '为笔记 API 加注册和登录接口(bcrypt 哈希 + 返回 JWT),部署后提交 curl 调用示例',
    doneCriteria: ['密码以 bcrypt 哈希存储', '登录成功返回 JWT', '错误密码返回 401'],
    submitFields: ['link', 'text'],
    estimateHours: 5,
    resources: [JWT, BCRYPT],
  },
  {
    title: '认证:前端登录与数据隔离',
    deliverable: '前端加登录/注册页,笔记接口要求 JWT 且按用户隔离,重新部署并提交链接',
    doneCriteria: ['未登录访问笔记接口返回 401', '用户 A 无法读取或修改用户 B 的笔记', '前端可登录和退出'],
    submitFields: ['link'],
    estimateHours: 5,
    resources: [JWT],
  },
  {
    title: '上线:结构化请求日志',
    deliverable: '为笔记后端接入 Pino 结构化日志并区分开发/生产环境变量,提交仓库链接',
    doneCriteria: ['每个请求输出一行 JSON 日志', '日志包含方法、路径、状态码和耗时', '开发与生产环境变量分开配置'],
    submitFields: ['link'],
    estimateHours: 4,
    resources: [PINO],
  },
  {
    title: '上线:Sentry 错误监控',
    deliverable: '为前后端接入 Sentry,故意触发一个错误,提交仓库链接和 Sentry 中该错误的链接',
    doneCriteria: ['后端错误在 Sentry 中可见', '前端错误在 Sentry 中可见', '提交的 Sentry 错误链接可打开'],
    submitFields: ['link'],
    estimateHours: 4,
    resources: [SENTRY],
  },
  {
    title: '测试:5 个接口测试',
    deliverable: '用 Vitest 为笔记 API 写至少 5 个接口测试并本地全部通过,提交仓库链接和测试数量',
    doneCriteria: ['至少 5 个后端接口测试', '覆盖创建、读取、更新、删除和 401', '本地运行全部通过'],
    submitFields: ['link', 'number'],
    estimateHours: 5,
    resources: [VITEST],
  },
  {
    title: '测试:组件测试与 CI',
    deliverable: '写至少 2 个前端组件测试,配置 GitHub Actions,提交 CI 通过的 PR 链接和测试数量',
    doneCriteria: ['至少 2 个前端组件测试', 'GitHub Actions 同时运行接口和组件测试', 'PR 上 CI 运行通过(绿色)'],
    submitFields: ['link', 'number'],
    estimateHours: 5,
    resources: [RTL, GHA],
  },
  {
    title: '作品集:项目展示页上线',
    deliverable: '部署作品集网站,放上前面周里的至少 5 个项目(含线上和仓库链接),提交网站链接',
    doneCriteria: ['放上前面周里的至少 5 个项目', '每个项目有截图、技术栈、线上和仓库链接', '手机端显示正常'],
    submitFields: ['link'],
    estimateHours: 5,
    resources: [PORTFOLIOS, NEXT],
  },
  {
    title: '作品集:简历与个人介绍',
    deliverable: '为作品集加上个人介绍、技能栈和可下载的 PDF 技术简历,重新部署并提交网站链接',
    doneCriteria: ['页面可下载 PDF 技术简历', '有个人介绍和技能栈', '有联系方式'],
    submitFields: ['link'],
    estimateHours: 5,
    resources: [PORTFOLIOS],
  },
];

/** Deterministic tier selection: 5 → split plan, 10/15/20 → standard 12-week plan. */
export function selectTechSelfTaughtTemplate(weeklyHours: number): PlanWeekData[] {
  return weeklyHours <= 5 ? templatePlan5h : templatePlanStandard;
}

export interface WeekPlan {
  title: string;
  milestone: string;
  topics: string[];
  resources: string[];
  practiceHours: number;
}

export interface WeekMessage {
  type: 'week';
  index: number;
  data: WeekPlan;
  source: 'ai' | 'template';
}

export interface DoneMessage {
  type: 'done';
  fallbackWeeks?: number;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
  fallbackWeeks?: number;
}

export type PlanMessage = WeekMessage | DoneMessage | ErrorMessage;

export const mockWeeks: WeekPlan[] = [
  {
    title: '编程基础与环境搭建',
    milestone: '完成开发环境配置，掌握基本语法',
    topics: ['VS Code 配置', 'Git 基础', 'HTML/CSS 入门', 'JavaScript 变量与函数'],
    resources: ['MDN Web Docs', 'freeCodeCamp', 'Git 官方教程'],
    practiceHours: 10,
  },
  {
    title: 'JavaScript 核心概念',
    milestone: '理解异步编程、闭包、原型链',
    topics: ['Promise 与 async/await', '闭包与作用域', 'this 绑定', '原型继承'],
    resources: ['JavaScript.info', "You Don't Know JS"],
    practiceHours: 12,
  },
  {
    title: 'React 基础',
    milestone: '能独立开发简单组件',
    topics: ['组件与 Props', 'State 与生命周期', 'Hooks 入门', '事件处理'],
    resources: ['React 官方文档', 'React 速成课程'],
    practiceHours: 15,
  },
  {
    title: 'React 进阶与状态管理',
    milestone: '掌握复杂状态管理',
    topics: ['useContext + useReducer', '自定义 Hooks', '性能优化', 'React Router'],
    resources: ['React 官方文档进阶', 'Kent C. Dodds 博客'],
    practiceHours: 12,
  },
  {
    title: 'TypeScript 基础',
    milestone: '为项目添加类型安全',
    topics: ['基础类型', '接口与类型别名', '泛型', 'TypeScript 配置'],
    resources: ['TypeScript 官方手册', 'TypeScript Deep Dive'],
    practiceHours: 10,
  },
  {
    title: 'Next.js 与全栈开发',
    milestone: '完成第一个全栈项目',
    topics: ['App Router', 'Server Components', 'API Routes', '数据获取'],
    resources: ['Next.js 官方文档', 'Vercel 教程'],
    practiceHours: 15,
  },
  {
    title: 'CSS 框架与样式工程',
    milestone: '掌握现代样式方案',
    topics: ['Tailwind CSS', 'CSS Modules', '响应式设计', '暗色模式'],
    resources: ['Tailwind 官方文档', 'CSS Tricks'],
    practiceHours: 8,
  },
  {
    title: '数据库与后端基础',
    milestone: '理解前后端交互',
    topics: ['SQL 基础', 'RESTful API', 'Prisma ORM', '身份验证'],
    resources: ['PostgreSQL 教程', 'Prisma 文档'],
    practiceHours: 12,
  },
  {
    title: '实战项目一：Todo 应用',
    milestone: '完成增删改查功能',
    topics: ['需求分析', '数据库设计', 'CRUD 实现', '部署上线'],
    resources: ['GitHub 优秀项目', 'Vercel 部署文档'],
    practiceHours: 20,
  },
  {
    title: '实战项目二：个人博客',
    milestone: '构建完整内容管理系统',
    topics: ['Markdown 渲染', '标签分类', '搜索功能', 'SEO 优化'],
    resources: ['Next.js 博客教程', 'MDX 文档'],
    practiceHours: 20,
  },
  {
    title: '测试与工程化',
    milestone: '建立质量保障体系',
    topics: ['Jest 单元测试', 'React Testing Library', 'E2E 测试', 'CI/CD'],
    resources: ['Testing Library 文档', 'GitHub Actions 教程'],
    practiceHours: 10,
  },
  {
    title: '性能优化与最佳实践',
    milestone: '提升应用性能',
    topics: ['Bundle 分析', '懒加载', '缓存策略', 'Web Vitals'],
    resources: ['web.dev', 'Chrome DevTools 文档'],
    practiceHours: 8,
  },
];

export function generateMockPlanStream(
  requestBody: {
    trackId: string;
    answers: Record<string, string>;
    weeks?: string[];
    keptWeeks?: string[];
  },
  shouldFail = false,
  shouldTimeout = false
): AsyncGenerator<PlanMessage, void, unknown> {
  return (async function* () {
    if (shouldFail) {
      yield {
        type: 'error',
        message: '生成失败，使用模板计划',
        fallbackWeeks: 12,
      } as ErrorMessage;
      return;
    }

    const weeklyHours = parseInt(requestBody.answers.weekly_hours || '10');
    const totalWeeks = Math.min(Math.max(Math.ceil(120 / weeklyHours), 8), 16);

    const startIndex = requestBody.keptWeeks?.length || 0;
    const weeksToGenerate = requestBody.weeks?.length || totalWeeks - startIndex;

    for (let i = 0; i < weeksToGenerate; i++) {
      if (shouldTimeout && i >= 3) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 300));

      const weekData = mockWeeks[i % mockWeeks.length];
      const isTemplate = i >= 6;

      yield {
        type: 'week',
        index: startIndex + i,
        data: weekData,
        source: isTemplate ? 'template' : 'ai',
      } as WeekMessage;
    }

    yield {
      type: 'done',
      fallbackWeeks: shouldTimeout ? totalWeeks - 3 : undefined,
    } as DoneMessage;
  })();
}

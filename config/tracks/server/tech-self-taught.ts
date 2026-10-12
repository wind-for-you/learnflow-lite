import type { TrackConfig, WeekData } from '../../../lib/server/types';

export const techSelfTaughtTrack: TrackConfig = {
  trackId: 'tech-self-taught',
  name: '技术自学转行',
  description: '从零开始自学编程,转行进入技术领域',
  
  prompt: `You are creating a personalized learning roadmap for someone transitioning into tech through self-study.

Core principles:
- Every week must have at least ONE concrete hands-on project to build and ship
- Week 1 should start with something achievable in 30 minutes that gives immediate gratification
- Focus on building real things, not just consuming tutorials
- Each deliverable must be specific and measurable
- Progress from simple to complex, ensuring each week builds on previous work
- Include deployment/shipping as part of the learning (GitHub Pages, Vercel, etc.)

The roadmap should help the learner:
1. Build a portfolio of real projects they can show employers
2. Develop practical problem-solving skills through hands-on work
3. Learn by doing, not by passive study
4. Gain confidence through shipping working products
5. Connect concepts to real-world applications

Format: Output one JSON object per line, each representing one week of the plan.`,

  templatePlan: [
    {
      title: '启程:第一个网页上线',
      milestone: '完成并部署第一个个人网页',
      tasks: [
        {
          title: '30分钟做出第一个网页',
          description: '使用 HTML 和 CSS 创建一个简单的个人介绍页面,包含照片、自我介绍和联系方式',
          deliverable: '创建并部署一个包含个人简介、技能列表和联系方式的单页网站到 GitHub Pages',
          acceptanceCriteria: [
            '页面包含个人照片或头像',
            '有清晰的自我介绍(50-100字)',
            '列出3-5项想学习的技能',
            '包含至少一种联系方式(邮箱或社交媒体)',
            '成功部署到 GitHub Pages 并可通过 URL 访问'
          ],
          estimatedHours: 4,
          references: [
            { title: 'HTML 基础教程', url: 'https://developer.mozilla.org/zh-CN/docs/Learn/HTML', type: 'doc' },
            { title: 'GitHub Pages 部署指南', url: 'https://pages.github.com/', type: 'doc' },
            { title: 'VS Code 编辑器下载', url: 'https://code.visualstudio.com/', type: 'tool' }
          ]
        }
      ],
      resources: [
        { title: 'MDN Web 文档', url: 'https://developer.mozilla.org/zh-CN/', type: 'doc' }
      ]
    },
    {
      title: '交互:让网页动起来',
      milestone: '掌握 JavaScript 基础并实现页面交互',
      tasks: [
        {
          title: '构建交互式计算器',
          description: '使用原生 JavaScript 构建一个网页计算器,支持基本四则运算',
          deliverable: '开发并部署一个功能完整的计算器应用,支持加减乘除、清除和连续计算',
          acceptanceCriteria: [
            '实现加、减、乘、除四种运算',
            '有清除(C)和等号(=)按钮',
            '能正确处理小数运算',
            '有基本的错误处理(如除以零)',
            '界面美观,在手机和电脑上都能正常使用',
            '部署到 Vercel 或 Netlify'
          ],
          estimatedHours: 6,
          references: [
            { title: 'JavaScript 基础', url: 'https://javascript.info/', type: 'tutorial' },
            { title: 'DOM 操作指南', url: 'https://developer.mozilla.org/zh-CN/docs/Web/API/Document_Object_Model', type: 'doc' },
            { title: 'Vercel 部署教程', url: 'https://vercel.com/docs', type: 'doc' }
          ]
        }
      ]
    },
    {
      title: '数据:待办事项应用',
      milestone: '理解数据持久化,构建 CRUD 应用',
      tasks: [
        {
          title: '开发 Todo List 应用',
          description: '创建一个功能完整的待办事项管理应用,支持添加、完成、删除和数据本地存储',
          deliverable: '构建并部署支持数据持久化的 Todo List 应用,使用 localStorage 保存数据',
          acceptanceCriteria: [
            '可以添加新的待办事项',
            '点击可标记为完成/未完成',
            '可以删除待办事项',
            '数据保存在 localStorage,刷新页面不丢失',
            '有待办和已完成的统计显示',
            '代码结构清晰,使用函数封装逻辑',
            '部署上线并可正常使用'
          ],
          estimatedHours: 8,
          references: [
            { title: 'localStorage API', url: 'https://developer.mozilla.org/zh-CN/docs/Web/API/Window/localStorage', type: 'doc' },
            { title: 'Todo MVC 示例', url: 'https://todomvc.com/', type: 'tutorial' }
          ]
        }
      ]
    },
    {
      title: 'React 入门:组件化思维',
      milestone: '使用 React 重构项目,理解组件化开发',
      tasks: [
        {
          title: '用 React 重写 Todo List',
          description: '使用 React 框架重构之前的 Todo List,学习组件化、状态管理和 Hooks',
          deliverable: '使用 Create React App 或 Vite 创建项目,用 React 实现完整的 Todo List 功能',
          acceptanceCriteria: [
            '使用函数组件和 Hooks(useState, useEffect)',
            '至少拆分3个组件(输入框、列表、单个待办项)',
            '保持所有原有功能(增删改查、持久化)',
            '代码使用 ES6+ 语法',
            '有基本的 PropTypes 或 TypeScript 类型检查',
            '部署到 Vercel'
          ],
          estimatedHours: 10,
          references: [
            { title: 'React 官方文档', url: 'https://react.dev/', type: 'doc' },
            { title: 'React Hooks 详解', url: 'https://react.dev/reference/react', type: 'doc' },
            { title: 'Vite 快速开始', url: 'https://vitejs.dev/guide/', type: 'doc' }
          ]
        }
      ]
    },
    {
      title: 'API 集成:连接真实数据',
      milestone: '学会使用 API 获取和展示数据',
      tasks: [
        {
          title: '构建天气查询应用',
          description: '使用公开的天气 API 创建一个城市天气查询应用',
          deliverable: '开发并部署一个可以查询任意城市当前天气和未来预报的 React 应用',
          acceptanceCriteria: [
            '集成免费天气 API(如 OpenWeatherMap 或和风天气)',
            '用户可以搜索城市名称',
            '显示当前温度、天气状况、湿度等信息',
            '展示未来3-5天的天气预报',
            '有加载状态和错误处理',
            '界面美观,响应式设计',
            '使用环境变量管理 API Key'
          ],
          estimatedHours: 8,
          references: [
            { title: 'OpenWeatherMap API', url: 'https://openweathermap.org/api', type: 'doc' },
            { title: 'Fetch API 使用', url: 'https://developer.mozilla.org/zh-CN/docs/Web/API/Fetch_API', type: 'doc' },
            { title: '和风天气 API', url: 'https://dev.qweather.com/', type: 'doc' }
          ]
        }
      ]
    },
    {
      title: '后端基础:Node.js 和 Express',
      milestone: '搭建第一个后端 API 服务',
      tasks: [
        {
          title: '创建 RESTful API 服务',
          description: '使用 Node.js 和 Express 构建一个笔记管理的后端 API',
          deliverable: '开发并部署支持 CRUD 操作的 RESTful API,使用文件或内存存储数据',
          acceptanceCriteria: [
            '实现 GET /notes (获取所有笔记)',
            '实现 POST /notes (创建新笔记)',
            '实现 PUT /notes/:id (更新笔记)',
            '实现 DELETE /notes/:id (删除笔记)',
            '有基本的输入验证和错误处理',
            '使用 JSON 格式交互',
            '部署到 Render 或 Railway',
            '提供 API 文档或 Postman Collection'
          ],
          estimatedHours: 10,
          references: [
            { title: 'Express.js 官方指南', url: 'https://expressjs.com/', type: 'doc' },
            { title: 'RESTful API 设计', url: 'https://restfulapi.net/', type: 'doc' },
            { title: 'Render 部署教程', url: 'https://render.com/docs', type: 'doc' }
          ]
        }
      ]
    },
    {
      title: '数据库:持久化存储',
      milestone: '集成数据库实现真实的数据持久化',
      tasks: [
        {
          title: '为笔记 API 添加 PostgreSQL',
          description: '将上周的笔记 API 改造为使用真实数据库存储',
          deliverable: '使用 PostgreSQL 数据库重构笔记 API,支持完整的 CRUD 操作和数据持久化',
          acceptanceCriteria: [
            '使用 PostgreSQL 作为数据库',
            '通过 node-postgres 或 Prisma 连接数据库',
            '有数据库 schema 设计(至少包含 id, title, content, created_at, updated_at)',
            '所有 API 端点使用数据库而非内存/文件',
            '有基本的 SQL 注入防护',
            '数据库部署到云端(如 Supabase 或 Railway)',
            '更新 API 文档'
          ],
          estimatedHours: 10,
          references: [
            { title: 'PostgreSQL 教程', url: 'https://www.postgresql.org/docs/', type: 'doc' },
            { title: 'Prisma ORM', url: 'https://www.prisma.io/docs', type: 'doc' },
            { title: 'Supabase 快速开始', url: 'https://supabase.com/docs', type: 'doc' }
          ]
        }
      ]
    },
    {
      title: '全栈整合:完整应用',
      milestone: '前后端整合,构建完整的全栈应用',
      tasks: [
        {
          title: '开发全栈笔记应用',
          description: '创建一个连接后端 API 的前端笔记应用,实现完整的用户体验',
          deliverable: '部署一个前后端分离的笔记应用,前端 React + 后端 Express + PostgreSQL',
          acceptanceCriteria: [
            'React 前端实现笔记的展示、创建、编辑、删除',
            '支持 Markdown 编辑和预览',
            '有搜索和筛选功能',
            '前后端通过 CORS 正确配置通信',
            '有加载状态、错误提示和空状态处理',
            '前端部署到 Vercel,后端部署到 Render',
            '提供完整的 README 说明使用方法'
          ],
          estimatedHours: 12,
          references: [
            { title: 'CORS 配置', url: 'https://developer.mozilla.org/zh-CN/docs/Web/HTTP/CORS', type: 'doc' },
            { title: 'React Markdown', url: 'https://github.com/remarkjs/react-markdown', type: 'tool' }
          ]
        }
      ]
    },
    {
      title: '认证授权:用户系统',
      milestone: '实现用户注册登录和权限管理',
      tasks: [
        {
          title: '添加用户认证系统',
          description: '为笔记应用添加用户注册、登录和 JWT 认证',
          deliverable: '实现完整的用户认证流程,每个用户只能查看和管理自己的笔记',
          acceptanceCriteria: [
            '实现用户注册和登录 API',
            '使用 bcrypt 加密密码',
            '使用 JWT 进行身份验证',
            '前端实现登录/注册表单',
            '前端保存和管理 JWT token',
            '所有笔记 API 需要认证',
            '用户只能操作自己的笔记',
            '有退出登录功能'
          ],
          estimatedHours: 10,
          references: [
            { title: 'JWT 介绍', url: 'https://jwt.io/introduction', type: 'doc' },
            { title: 'bcrypt 库', url: 'https://www.npmjs.com/package/bcrypt', type: 'doc' },
            { title: 'Express JWT 中间件', url: 'https://www.npmjs.com/package/express-jwt', type: 'doc' }
          ]
        }
      ]
    },
    {
      title: '部署优化:生产级应用',
      milestone: '学习生产环境部署和监控',
      tasks: [
        {
          title: '应用生产化改造',
          description: '添加日志、监控、错误处理和性能优化',
          deliverable: '完善应用的生产环境配置,包括日志、错误监控和基本的性能优化',
          acceptanceCriteria: [
            '配置生产和开发环境变量',
            '添加结构化日志(如 Winston 或 Pino)',
            '集成错误监控(如 Sentry)',
            '前端添加 loading 和 skeleton screen',
            '后端添加请求日志和错误处理中间件',
            '配置 HTTPS',
            '编写部署文档',
            '有基本的性能测试报告'
          ],
          estimatedHours: 8,
          references: [
            { title: 'Winston 日志库', url: 'https://github.com/winstonjs/winston', type: 'doc' },
            { title: 'Sentry 文档', url: 'https://docs.sentry.io/', type: 'doc' },
            { title: 'Web Performance', url: 'https://web.dev/performance/', type: 'doc' }
          ]
        }
      ]
    },
    {
      title: '测试:质量保证',
      milestone: '为应用添加自动化测试',
      tasks: [
        {
          title: '编写单元和集成测试',
          description: '使用测试框架为前后端添加测试覆盖',
          deliverable: '为关键功能编写测试,设置 CI 自动运行测试',
          acceptanceCriteria: [
            '后端使用 Jest 或 Vitest 编写 API 测试',
            '测试覆盖所有 CRUD 端点',
            '前端使用 React Testing Library 测试关键组件',
            '测试覆盖率达到 60% 以上',
            '配置 GitHub Actions 自动运行测试',
            'PR 必须通过测试才能合并',
            '提供测试报告'
          ],
          estimatedHours: 10,
          references: [
            { title: 'Jest 文档', url: 'https://jestjs.io/', type: 'doc' },
            { title: 'React Testing Library', url: 'https://testing-library.com/react', type: 'doc' },
            { title: 'GitHub Actions', url: 'https://docs.github.com/actions', type: 'doc' }
          ]
        }
      ]
    },
    {
      title: '作品集:展示你的成果',
      milestone: '整理项目,准备作品集和简历',
      tasks: [
        {
          title: '构建个人作品集网站',
          description: '创建一个专业的作品集网站,展示所有完成的项目',
          deliverable: '开发并部署个人作品集网站,包含项目展示、技能栈和联系方式',
          acceptanceCriteria: [
            '展示至少 5 个项目(包括这 11 周做的)',
            '每个项目有截图、简介、技术栈、GitHub 链接和在线演示',
            '有个人简介和技能栈展示',
            '响应式设计,在各种设备上都好看',
            '有联系方式和社交媒体链接',
            '优化 SEO 和加载速度',
            '更新 GitHub profile README',
            '准备一份技术简历(PDF)'
          ],
          estimatedHours: 12,
          references: [
            { title: 'Portfolio 设计灵感', url: 'https://github.com/emmabostian/developer-portfolios', type: 'doc' },
            { title: 'Next.js 文档', url: 'https://nextjs.org/docs', type: 'doc' },
            { title: '技术简历模板', url: 'https://www.overleaf.com/latex/templates', type: 'tool' }
          ]
        }
      ]
    }
  ]
};

export default techSelfTaughtTrack;

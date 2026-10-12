export interface OnboardingQuestion {
  id: string;
  type: 'text' | 'select' | 'choice';
  question: string;
  placeholder?: string;
  options?: string[];
  /** type 为 choice 时的点选项，value 为提交给服务端的数值。 */
  choices?: Array<{ label: string; value: number }>;
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
  };
}

export interface TrackConfig {
  id: string;
  name: string;
  description: string;
  onboardingQuestions: OnboardingQuestion[];
}

export const techSelfTaughtTrack: TrackConfig = {
  id: 'tech-self-taught',
  name: '技术自学转行',
  description: 'AI 辅助的技术学习规划，帮助你系统化地完成职业转型',
  onboardingQuestions: [
    {
      id: 'currentLevel',
      type: 'text',
      question: '你目前的技术基础如何？',
      placeholder: '例如：零基础 / 学过 HTML+CSS / 计算机专业但没做开发...',
      validation: { required: true },
    },
    {
      id: 'targetRole',
      type: 'select',
      question: '你的目标岗位是？',
      options: [
        '前端工程师',
        '后端工程师',
        '全栈工程师',
        '移动端开发',
        '数据分析师',
        '其他',
      ],
      validation: { required: true },
    },
    {
      id: 'weeklyHours',
      type: 'choice',
      question: '每周投入几小时？',
      choices: [
        { label: '5 小时', value: 5 },
        { label: '10 小时', value: 10 },
        { label: '15 小时', value: 15 },
        { label: '20 小时以上', value: 20 },
      ],
      validation: { required: true },
    },
    {
      id: 'deadline',
      type: 'text',
      question: '期望的时间节点？',
      placeholder: '例如：6 个月内找到工作 / 1 年转行成功...',
      validation: { required: true },
    },
    {
      id: 'biggestBlocker',
      type: 'text',
      question: '你觉得最卡你的是什么？',
      placeholder: '例如：不知道从哪开始 / 坚持不下来 / 缺少实战项目...',
      validation: { required: true },
    },
  ],
};

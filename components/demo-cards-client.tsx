'use client';

import { LazyMotion, domAnimation, m } from 'motion/react';

const features = [
  {
    icon: '🎯',
    title: '个性化规划',
    description: '基于你的基础、目标和时间，AI 生成专属学习路线图',
  },
  {
    icon: '📅',
    title: '按周拆解',
    description: '每周明确的学习目标、里程碑和推荐资源',
  },
  {
    icon: '✅',
    title: '打卡跟进',
    description: '记录学习成果，保持学习节奏和动力',
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 },
};

export default function DemoCardsClient() {
  return (
    <LazyMotion features={domAnimation}>
      <m.div
        className="grid gap-6 md:grid-cols-3"
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-100px' }}
      >
        {features.map((feature) => (
          <m.div
            key={feature.title}
            variants={item}
            className="p-6 rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="text-4xl mb-4">{feature.icon}</div>
            <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
            <p className="text-gray-600">{feature.description}</p>
          </m.div>
        ))}
      </m.div>
    </LazyMotion>
  );
}

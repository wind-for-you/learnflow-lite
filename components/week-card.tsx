'use client';

import { m } from 'motion/react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { WeekPlan } from '@/lib/mock/plan-data';

interface WeekCardProps {
  week: WeekPlan & { index: number; source: 'ai' | 'template' };
  isLoading?: boolean;
}

const cardVariants = {
  hidden: { y: 20, opacity: 0 },
  show: { 
    y: 0, 
    opacity: 1,
    transition: { type: 'spring', stiffness: 100 }
  },
  exit: { 
    y: -20, 
    opacity: 0,
    transition: { duration: 0.2 }
  },
};

export function WeekCard({ week, isLoading }: WeekCardProps) {
  return (
    <m.div
      variants={cardVariants}
      layout
      className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${
        isLoading ? 'opacity-50 pointer-events-none' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">
            第 {week.index + 1} 周：{week.title}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            🎯 里程碑：{week.milestone}
          </p>
        </div>
        
        {week.source === 'template' && (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full whitespace-nowrap">
            模板计划
          </span>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="font-semibold text-gray-900 mb-2">📚 学习主题</h4>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            {week.topics.map((topic, idx) => (
              <li key={idx}>{topic}</li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-2">🔗 推荐资源</h4>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            {week.resources.map((resource, idx) => (
              <li key={idx}>{resource}</li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <span className="text-sm text-gray-600">
            ⏱️ 建议投入：{week.practiceHours} 小时
          </span>
          
          <Link href={`/checkin?week=${week.index}`}>
            <Button size="sm">打卡</Button>
          </Link>
        </div>
      </div>
    </m.div>
  );
}

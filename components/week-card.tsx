'use client';

import { m } from 'motion/react';
import { LinkButton } from '@/components/ui/link-button';
import type { StoredWeek } from '@/lib/utils/local-storage';

interface WeekCardProps {
  week: StoredWeek;
  goalId: string;
  isLoading?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
}

const cardVariants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: 'spring' as const, stiffness: 100 } },
  exit: { y: -20, opacity: 0, transition: { duration: 0.2 } },
};

export function WeekCard({ week, goalId, isLoading, collapsed = false, onToggle }: WeekCardProps) {
  const checkinHref = `/checkin?goalId=${encodeURIComponent(goalId)}&week=${week.index}`;
  const bodyId = `week-${week.index}-body`;

  return (
    <m.article
      variants={cardVariants}
      layout
      data-testid="week-card"
      className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6 ${
        isLoading ? 'pointer-events-none opacity-50' : ''
      }`}
    >
      <header>
        <h3 className="text-lg font-bold text-gray-900 sm:text-xl">
          第 {week.index + 1} 周：{week.title}
        </h3>
        {week.source === 'template' && (
          <span className="mt-2 inline-block rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
            模板计划
          </span>
        )}
      </header>

      {week.index === 0 && week.firstStep && !collapsed && (
        <div className="mt-4 rounded-lg border border-success-200 bg-success-50 p-3 text-sm text-success-800">
          <span className="font-semibold">🚀 第一步（{week.firstStep.minutes} 分钟）：</span>
          {week.firstStep.action}
        </div>
      )}

      <p className="mt-3 text-sm text-gray-700">
        <span className="font-semibold text-gray-900">📦 本周产出：</span>
        {week.deliverable}
      </p>

      {!collapsed && (
        <div id={bodyId} className="mt-4 space-y-4">
          <div>
            <h4 className="mb-2 font-semibold text-gray-900">✅ 完成标准</h4>
            <ul className="list-inside list-disc space-y-1 text-gray-700">
              {week.doneCriteria.map((criterion) => (
                <li key={criterion}>{criterion}</li>
              ))}
            </ul>
          </div>

          {week.resources && week.resources.length > 0 && (
            <div>
              <h4 className="mb-2 font-semibold text-gray-900">🔗 推荐资源</h4>
              <ul className="space-y-1">
                {week.resources.map((resource) => (
                  <li key={resource.url}>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center text-primary-700 underline"
                    >
                      {resource.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
        <span className="text-sm text-gray-600">⏱️ 预计投入：{week.estimateHours} 小时</span>
        <div className="flex gap-2">
          {onToggle && (
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={!collapsed}
              aria-controls={bodyId}
              className="inline-flex min-h-11 items-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium hover:bg-gray-50"
            >
              {collapsed ? '展开' : '收起'}
            </button>
          )}
          <LinkButton href={checkinHref}>打卡</LinkButton>
        </div>
      </div>
    </m.article>
  );
}

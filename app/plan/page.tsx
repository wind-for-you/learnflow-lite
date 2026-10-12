'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { getGoal } from '@/lib/utils/local-storage';
import { getDeviceId } from '@/lib/utils/device-id';
import { fetchPlanStream } from '@/lib/mock/plan-api';
import { trackEvent } from '@/lib/analytics/client';
import type { WeekPlan, PlanMessage } from '@/lib/mock/plan-data';
import { WeekCard } from '@/components/week-card';
import { RoadmapRenderer } from '@/components/roadmap-renderer';
import { FeedbackWidget } from '@/components/feedback-widget';

interface WeekWithSource extends WeekPlan {
  index: number;
  source: 'ai' | 'template';
}

function PlanPageContent() {
  const searchParams = useSearchParams();
  const goalId = searchParams?.get('goalId');
  
  const [weeks, setWeeks] = useState<WeekWithSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [regeneratingFrom, setRegeneratingFrom] = useState<number | null>(null);

  useEffect(() => {
    if (!goalId) {
      setError('未找到目标 ID');
      setLoading(false);
      return;
    }

    const goal = getGoal();
    if (!goal || goal.goalId !== goalId) {
      setError('目标数据不存在');
      setLoading(false);
      return;
    }

    generatePlan(goal.trackId, goal.answers);
  }, [goalId]);

  const generatePlan = async (
    trackId: string,
    answers: Record<string, string>,
    fromIndex?: number,
    keptTitles?: string[]
  ) => {
    setLoading(true);
    setError('');
    setRegeneratingFrom(fromIndex ?? null);

    const deviceId = getDeviceId();
    const newWeeks: WeekWithSource[] = fromIndex !== undefined ? weeks.slice(0, fromIndex) : [];
    let usedFallback = false;

    try {
      await fetchPlanStream(
        {
          trackId,
          answers,
          deviceId,
          weeks: fromIndex !== undefined ? [`${weeks.length - fromIndex}`] : undefined,
          keptWeeks: keptTitles,
        },
        (message: PlanMessage) => {
          if (message.type === 'week') {
            newWeeks.push({
              ...message.data,
              index: message.index,
              source: message.source,
            });
            setWeeks([...newWeeks]);
          } else if (message.type === 'error') {
            setError(message.message);
            usedFallback = true;
          } else if (message.type === 'done') {
            if (message.fallbackWeeks) {
              usedFallback = true;
            }
          }
        },
        (err) => {
          setError(err.message);
          usedFallback = true;
        },
        () => {
          setLoading(false);
          setRegeneratingFrom(null);
          
          if (goalId) {
            trackEvent('plan_generated', {
              isFallback: usedFallback,
              goalId,
              weekCount: newWeeks.length,
            });
          }
          
          setTimeout(() => setShowRoadmap(true), 500);
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
      setLoading(false);
      setRegeneratingFrom(null);
    }
  };

  const handleRegenerate = (fromIndex: number) => {
    const goal = getGoal();
    if (!goal) return;
    
    const keptTitles = weeks.slice(0, fromIndex).map((w) => w.title);
    generatePlan(goal.trackId, goal.answers, fromIndex, keptTitles);
  };

  const hasTemplateWeeks = weeks.some((w) => w.source === 'template');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">你的学习计划</h1>
          <FeedbackWidget />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
            {error}
          </div>
        )}

        <LazyMotion features={domAnimation}>
          <m.div
            className="space-y-6"
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: { staggerChildren: 0.1 },
              },
            }}
          >
            <AnimatePresence mode="popLayout">
              {weeks.map((week) => (
                <WeekCard
                  key={week.index}
                  week={week}
                  isLoading={regeneratingFrom !== null && week.index >= regeneratingFrom}
                />
              ))}
            </AnimatePresence>
          </m.div>
        </LazyMotion>

        {loading && (
          <div className="mt-6 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
            <p className="mt-2 text-gray-600">AI 正在生成你的计划...</p>
          </div>
        )}

        {hasTemplateWeeks && !loading && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 mb-3">
              ⚠️ 部分内容使用了模板计划。你可以：
            </p>
            <Button
              size="sm"
              onClick={() => {
                const firstTemplateIndex = weeks.findIndex((w) => w.source === 'template');
                if (firstTemplateIndex >= 0) {
                  handleRegenerate(firstTemplateIndex);
                }
              }}
              disabled={loading}
            >
              重新生成模板周
            </Button>
          </div>
        )}

        {showRoadmap && weeks.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">学习路线图</h2>
            <RoadmapRenderer weeks={weeks} />
          </div>
        )}
      </main>
    </div>
  );
}

export default function PlanPage() {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <PlanPageContent />
    </Suspense>
  );
}

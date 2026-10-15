'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { LinkButton } from '@/components/ui/link-button';
import { getGoal, loadPlan, savePlan, clearPlan, type StoredWeek, type GoalData } from '@/lib/utils/local-storage';
import { getDeviceId } from '@/lib/utils/device-id';
import {
  fetchPlanStream,
  isMockEnabled,
  TEMPLATE_FALLBACK_LABEL,
  type ClientScenario,
  type PlanErrorKind,
} from '@/lib/mock/plan-api';
import { trackEvent } from '@/lib/analytics/client';
import { WeekCard } from '@/components/week-card';
import dynamic from 'next/dynamic';
import { FeedbackWidget } from '@/components/feedback-widget';

const RoadmapRenderer = dynamic(
  () => import('@/components/roadmap-renderer').then((mod) => mod.RoadmapRenderer),
  { ssr: false, loading: () => <p className="text-sm text-gray-500">路线图加载中...</p> }
);

const EXPANDED_WEEKS = 4;
const SCENARIOS: ClientScenario[] = ['ok', 'fail', 'truncate', 'not_found', 'rate_limited', 'offline'];

type PageIssue =
  | { kind: 'no_goal' }
  | { kind: 'outdated' }
  | { kind: PlanErrorKind; resetAt?: string };

const ISSUE_TEXT: Record<PageIssue['kind'], { title: string; body: string }> = {
  no_goal: { title: '还没有学习目标', body: '先回答几个问题，我们再为你生成计划。' },
  outdated: { title: '计划格式已更新，请重新生成', body: '本地保存的旧计划无法在新版本中显示。' },
  not_found: { title: '计划服务暂不可用', body: `服务暂时无法访问 (404)，已${TEMPLATE_FALLBACK_LABEL}。` },
  // TODO(#5): 合入后改用 lib/shared/plan.ts 的 RateLimitError { limit, remaining, resetAt } 展示精确剩余次数与恢复时间
  rate_limited: { title: '今天的次数用完了，北京时间 0 点恢复', body: `已${TEMPLATE_FALLBACK_LABEL}，可以先按模板计划学起来。` },
  offline: { title: '网络已断开', body: `已生成的内容会保留，未完成的部分${TEMPLATE_FALLBACK_LABEL}；联网后可重试。` },
  server: { title: 'AI 生成失败', body: `服务器出了点问题，已${TEMPLATE_FALLBACK_LABEL}。` },
  stream: { title: '生成中断', body: `数据流中断，剩余周已${TEMPLATE_FALLBACK_LABEL}。` },
};

function sortWeeks(list: StoredWeek[]): StoredWeek[] {
  return [...list].sort((a, b) => a.index - b.index);
}

function PlanPageContent() {
  const searchParams = useSearchParams();
  const goalId = searchParams?.get('goalId') ?? '';
  const scenarioParam = searchParams?.get('mock') as ClientScenario | null;
  const scenario = isMockEnabled() && scenarioParam && SCENARIOS.includes(scenarioParam) ? scenarioParam : undefined;

  const [weeks, setWeeks] = useState<StoredWeek[]>([]);
  const [loading, setLoading] = useState(true);
  const [issue, setIssue] = useState<PageIssue | null>(null);
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [regeneratingFrom, setRegeneratingFrom] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const weeksRef = useRef<StoredWeek[]>([]);

  const generatePlan = useCallback(
    async (goal: GoalData, regenerate?: number[]) => {
      setLoading(true);
      setIssue(null);
      setRegeneratingFrom(regenerate ? Math.min(...regenerate) : null);

      const kept = regenerate ? weeksRef.current.filter((w) => !regenerate.includes(w.index)) : [];
      let current: StoredWeek[] = regenerate ? weeksRef.current : [];
      if (!regenerate) {
        weeksRef.current = [];
        setWeeks([]);
      }
      let errorKind: PlanErrorKind | null = null;

      await fetchPlanStream(
        {
          trackId: goal.trackId,
          answers: goal.answers,
          deviceId: getDeviceId(),
          weeks: regenerate,
          keptWeeks: regenerate ? kept.map((w) => ({ index: w.index, title: w.title })) : undefined,
        },
        (message) => {
          if (message.type !== 'week') return;
          const week: StoredWeek = { ...message.data, index: message.index, source: message.source };
          current = sortWeeks([...current.filter((w) => w.index !== week.index), week]);
          weeksRef.current = current;
          setWeeks(current);
        },
        (err) => {
          errorKind = err.kind;
          setIssue({ kind: err.kind, resetAt: err.resetAt });
        },
        ({ templateFilled }) => {
          setLoading(false);
          setRegeneratingFrom(null);
          if (current.length > 0) savePlan(goal.goalId, current);
          trackEvent('plan_generated', {
            isFallback: errorKind !== null || templateFilled.length > 0,
            goalId: goal.goalId,
            weekCount: current.length,
          });
          setTimeout(() => setShowRoadmap(true), 300);
        },
        { scenario }
      );
    },
    [scenario]
  );

  // 计划与目标存在 localStorage（外部存储），只能在挂载后读取，避免 SSR 水合不一致。
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const goal = getGoal();
    if (!goalId || !goal || goal.goalId !== goalId) {
      setIssue({ kind: 'no_goal' });
      setLoading(false);
      return;
    }
    const stored = loadPlan(goalId);
    if (stored.status === 'outdated') {
      setIssue({ kind: 'outdated' });
      setLoading(false);
      return;
    }
    if (stored.status === 'ok') {
      weeksRef.current = stored.plan.weeks;
      setWeeks(stored.plan.weeks);
      setLoading(false);
      setShowRoadmap(true);
      return;
    }
    void generatePlan(goal);
  }, [goalId, generatePlan]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const restart = () => {
    const goal = getGoal();
    if (!goal) return;
    clearPlan();
    void generatePlan(goal);
  };

  const regenerateTemplates = () => {
    const goal = getGoal();
    if (!goal) return;
    const templateIdx = weeks.filter((w) => w.source === 'template').map((w) => w.index);
    if (templateIdx.length > 0) void generatePlan(goal, templateIdx);
  };

  const hasTemplateWeeks = weeks.some((w) => w.source === 'template');
  const isExpanded = (index: number) => expanded[index] ?? index < EXPANDED_WEEKS;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2">
          <h1 className="text-xl font-bold">你的学习计划</h1>
          <FeedbackWidget />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
        {issue && (
          <div
            role="alert"
            data-testid={`plan-issue-${issue.kind}`}
            className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-900"
          >
            <p className="font-semibold">{ISSUE_TEXT[issue.kind].title}</p>
            <p className="mt-1 text-sm">
              {ISSUE_TEXT[issue.kind].body}
                          </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {issue.kind === 'no_goal' && <LinkButton href="/onboarding">开始规划</LinkButton>}
              {issue.kind === 'outdated' && (
                <Button size="sm" onClick={restart}>
                  重新生成
                </Button>
              )}
              {issue.kind !== 'no_goal' && issue.kind !== 'outdated' && issue.kind !== 'rate_limited' && !loading && (
                <Button size="sm" variant="outline" onClick={restart}>
                  重试
                </Button>
              )}
            </div>
          </div>
        )}

        <LazyMotion features={domAnimation}>
          <m.div
            className="space-y-4 sm:space-y-6"
            initial="hidden"
            animate="show"
            variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }}
          >
            <AnimatePresence mode="popLayout">
              {weeks.map((week) => (
                <WeekCard
                  key={week.index}
                  week={week}
                  goalId={goalId}
                  isLoading={regeneratingFrom !== null && week.source === 'template'}
                  collapsed={!isExpanded(week.index)}
                  onToggle={
                    weeks.length > EXPANDED_WEEKS
                      ? () => setExpanded((prev) => ({ ...prev, [week.index]: !isExpanded(week.index) }))
                      : undefined
                  }
                />
              ))}
            </AnimatePresence>
          </m.div>
        </LazyMotion>

        {loading && (
          <div className="mt-6 text-center" role="status">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent" />
            <p className="mt-2 text-gray-600">AI 正在生成你的计划...</p>
          </div>
        )}

        {hasTemplateWeeks && !loading && (
          <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="mb-3 text-sm text-blue-800">⚠️ 部分周{TEMPLATE_FALLBACK_LABEL}。你可以：</p>
            <Button size="sm" onClick={regenerateTemplates} disabled={loading}>
              重新生成模板周
            </Button>
          </div>
        )}

        {showRoadmap && !loading && weeks.length > 0 && (
          <div className="mt-12">
            <h2 className="mb-6 text-2xl font-bold">学习路线图</h2>
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

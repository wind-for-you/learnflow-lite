'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { SubmitField } from '@/lib/shared/plan';
import { saveCheckin, getCheckinForWeek, loadPlan, getGoal } from '@/lib/utils/local-storage';
import { trackEvent } from '@/lib/analytics/client';

const DEFAULT_FIELDS: SubmitField[] = ['text', 'number'];

const FIELD_META: Record<SubmitField, { label: string; placeholder: string }> = {
  text: { label: '本周成果说明', placeholder: '写下你完成了什么、遇到的问题和解决思路...' },
  link: { label: '成果链接', placeholder: 'https://github.com/your-repo' },
  number: { label: '实际投入小时数', placeholder: '10' },
};

function CheckinPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const weekIndex = Number.parseInt(searchParams?.get('week') ?? '0', 10) || 0;
  const goalId = searchParams?.get('goalId') || getGoal()?.goalId || '';
  const planHref = goalId ? `/plan?goalId=${encodeURIComponent(goalId)}` : '/plan';

  const [fields, setFields] = useState<SubmitField[]>(DEFAULT_FIELDS);
  const [title, setTitle] = useState('');
  const [values, setValues] = useState<Partial<Record<SubmitField, string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [existingCheckin, setExistingCheckin] = useState(false);

  // 从 localStorage（外部存储）读取，只能在挂载后进行。
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const stored = loadPlan(goalId || null);
    if (stored.status === 'ok') {
      const week = stored.plan.weeks.find((w) => w.index === weekIndex);
      if (week) {
        setFields(week.submitFields);
        setTitle(week.title);
      }
    }
    const existing = getCheckinForWeek(weekIndex);
    if (existing) {
      setValues(existing.values);
      setExistingCheckin(true);
    }
  }, [weekIndex, goalId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    saveCheckin({ weekIndex, goalId: goalId || undefined, values, timestamp: Date.now() });
    setSubmitted(true);

    if (!existingCheckin) {
      trackEvent('first_checkin', { weekIndex });
    }

    const confettiModule = await import('canvas-confetti');
    confettiModule.default({ particleCount: 100, spread: 70, origin: { y: 0.6 }, disableForReducedMotion: true });

    setTimeout(() => router.push(planHref), 2000);
  };

  const renderField = (field: SubmitField) => {
    const id = `checkin-${field}`;
    const common = {
      id,
      required: true,
      value: values[field] ?? '',
      placeholder: FIELD_META[field].placeholder,
    };
    const update = (val: string) => setValues((prev) => ({ ...prev, [field]: val }));
    return (
      <div key={field}>
        <label htmlFor={id} className="mb-2 block text-sm font-medium text-gray-900">
          {FIELD_META[field].label} *
        </label>
        {field === 'text' ? (
          <Textarea {...common} rows={5} onChange={(e) => update(e.target.value)} />
        ) : field === 'link' ? (
          <Input {...common} type="url" onChange={(e) => update(e.target.value)} />
        ) : (
          <Input {...common} type="number" min={0} step={0.5} inputMode="decimal" onChange={(e) => update(e.target.value)} />
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-success-50 to-white px-4 pb-8 pt-6 sm:pt-12">
      <div className="mx-auto w-full max-w-2xl">
        <div className="rounded-2xl bg-white p-6 shadow-lg sm:p-8">
          <h1 className="mb-2 text-3xl font-bold">第 {weekIndex + 1} 周打卡</h1>
          <p className="mb-6 text-gray-600">{title ? `${title} · ` : ''}记录你的学习成果，保持学习节奏 🎯</p>

          {submitted ? (
            <div className="py-12 text-center" role="status">
              <div className="mb-4 text-6xl">🎉</div>
              <h2 className="mb-2 text-2xl font-bold text-success-600">打卡成功！</h2>
              <p className="text-gray-600">继续保持，你做得很棒！即将返回计划...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {fields.map(renderField)}

              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                ⚠️ 数据存储在本机浏览器，换设备或清除缓存会丢失
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => router.push(planHref)} className="flex-1">
                  返回
                </Button>
                <Button type="submit" className="flex-1">
                  {existingCheckin ? '更新打卡' : '提交打卡'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CheckinPage() {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <CheckinPageContent />
    </Suspense>
  );
}

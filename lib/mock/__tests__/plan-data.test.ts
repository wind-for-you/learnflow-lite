import { describe, it, expect } from 'vitest';
import { PlanWeekData } from '@/lib/shared/plan';
import { generateMockPlanStream, templateWeeks, type PlanMessage } from '../plan-data';

async function collect(stream: AsyncGenerator<PlanMessage, void, unknown>) {
  const out: PlanMessage[] = [];
  for await (const m of stream) out.push(m);
  return out;
}

describe('templateWeeks', () => {
  it('全部符合共享契约 PlanWeekData', () => {
    for (const w of templateWeeks) {
      expect(PlanWeekData.safeParse(w).success).toBe(true);
    }
    expect(templateWeeks[0].firstStep).toBeDefined();
  });
});

describe('generateMockPlanStream', () => {
  it('生成周计划并以 done 结束', async () => {
    const msgs = await collect(
      generateMockPlanStream({ trackId: 't', answers: { weeklyHours: 10 } }, 'ok', 0)
    );
    const weeks = msgs.filter((m) => m.type === 'week');
    expect(weeks.length).toBe(12);
    expect(msgs[msgs.length - 1]?.type).toBe('done');
  });

  it('失败时返回 error 行', async () => {
    const msgs = await collect(generateMockPlanStream({ trackId: 't', answers: {} }, 'fail', 0));
    expect(msgs[0]?.type).toBe('error');
  });

  it('流断时只生成 3 周且无 done', async () => {
    const msgs = await collect(
      generateMockPlanStream({ trackId: 't', answers: { weeklyHours: 10 } }, 'truncate', 0)
    );
    expect(msgs.filter((m) => m.type === 'week')).toHaveLength(3);
    expect(msgs.some((m) => m.type === 'done')).toBe(false);
  });

  it('week 行数据符合契约，estimateHours 不超过每周投入', async () => {
    const msgs = await collect(
      generateMockPlanStream({ trackId: 't', answers: { weeklyHours: 5 } }, 'ok', 0)
    );
    for (const m of msgs) {
      if (m.type === 'week') {
        expect(PlanWeekData.safeParse(m.data).success).toBe(true);
        expect(m.data.estimateHours).toBeLessThanOrEqual(5);
        expect(m.source).toMatch(/^(ai|template)$/);
      }
    }
  });

  it('重新生成指定周时只返回这些周', async () => {
    const msgs = await collect(
      generateMockPlanStream({ trackId: 't', answers: { weeklyHours: 10 }, weeks: [6, 7] }, 'ok', 0)
    );
    const idx = msgs.flatMap((m) => (m.type === 'week' ? [m.index] : []));
    expect(idx).toEqual([6, 7]);
  });
});

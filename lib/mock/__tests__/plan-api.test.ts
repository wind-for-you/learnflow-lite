import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchPlanStream, PlanRequestError } from '../plan-api';
import { getTemplateWeek, type PlanMessage } from '../plan-data';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function run(status: number) {
  vi.stubEnv('NEXT_PUBLIC_USE_MOCK', 'false');
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status })));
  const messages: PlanMessage[] = [];
  const errors: PlanRequestError[] = [];
  const onComplete = vi.fn();
  await fetchPlanStream(
    { trackId: 't', answers: { weeklyHours: 10 } },
    (m) => messages.push(m),
    (e) => errors.push(e),
    onComplete
  );
  return { messages, errors, onComplete };
}

describe('fetchPlanStream 错误处理', () => {
  it('404：报错 not_found，仍调用 onComplete，并用模板周补齐', async () => {
    const { messages, errors, onComplete } = await run(404);
    expect(errors[0]?.kind).toBe('not_found');
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(messages.length).toBe(12);
    expect(messages.every((m) => m.type === 'week' && m.source === 'template')).toBe(true);
  });

  it('429：报错 rate_limited，提示 0 点恢复并用模板补齐', async () => {
    const { messages, errors, onComplete } = await run(429);
    expect(errors[0]?.kind).toBe('rate_limited');
    expect(errors[0]?.message).toBe('今天的次数用完了，北京时间 0 点恢复');
    expect(messages.filter((m) => m.type === 'week' && m.source === 'template')).toHaveLength(12);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('断网：fetch 抛错时报 offline', async () => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK', 'false');
    vi.stubGlobal('navigator', { onLine: false });
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    const errors: PlanRequestError[] = [];
    const onComplete = vi.fn();
    await fetchPlanStream({ trackId: 't', answers: {} }, () => {}, (e) => errors.push(e), onComplete);
    expect(errors[0]?.kind).toBe('offline');
    expect(onComplete).toHaveBeenCalled();
  });

  it('mock 模式下不请求 /api/plan', async () => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK', 'true');
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const onComplete = vi.fn();
    await fetchPlanStream({ trackId: 't', answers: { weeklyHours: 20 } }, () => {}, () => {}, onComplete, {
      mockStepMs: 0,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalled();
  });

  it('以 done{fallbackWeeks} 结束的流视为成功', async () => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK', 'false');
    const lines = Array.from({ length: 12 }, (_, i) =>
      JSON.stringify({ type: 'week', index: i, source: i >= 10 ? 'template' : 'ai', data: getTemplateWeek(i, 10) })
    );
    lines.push(JSON.stringify({ type: 'done', fallbackWeeks: [10, 11] }));
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(lines.join('\n') + '\n', { status: 200, headers: { 'Content-Type': 'application/x-ndjson' } }))
    );
    const messages: PlanMessage[] = [];
    const onError = vi.fn();
    const onComplete = vi.fn();
    await fetchPlanStream({ trackId: 't', answers: { weeklyHours: 10 } }, (m) => messages.push(m), onError, onComplete);
    expect(onError).not.toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalledWith({ templateFilled: [] });
    expect(messages.filter((m) => m.type === 'week')).toHaveLength(12);
    expect(messages[messages.length - 1]).toEqual({ type: 'done', fallbackWeeks: [10, 11] });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

const ctx = vi.hoisted(() => ({ env: {} as Record<string, unknown> }));
vi.mock('@opennextjs/cloudflare', () => ({ getCloudflareContext: () => ({ env: ctx.env, cf: undefined, ctx: {} }) }));

const rl = vi.hoisted(() => ({ allowed: true, limit: 'device' as 'device' | 'ip' }));
vi.mock('../lib/server/ratelimit', () => ({
  checkRateLimit: vi.fn(async () =>
    rl.allowed
      ? { allowed: true, remaining: 2, resetAt: '2026-10-12T16:00:00.000Z' }
      : { allowed: false, limit: rl.limit, remaining: 0, resetAt: '2026-10-12T16:00:00.000Z', count: 4 }
  ),
}));

import { RateLimitError } from '../lib/shared/plan';
import { POST as planPOST } from '../app/api/plan/route';
import { POST as waitlistPOST } from '../app/api/waitlist/route';

function mockDB(count = 0) {
  const runs: unknown[][] = [];
  const db = {
    prepare: (_sql: string) => ({
      bind: (...args: unknown[]) => ({
        first: async () => ({ count }),
        run: async () => {
          runs.push(args);
          return { success: true };
        },
      }),
    }),
  };
  return { db, runs };
}

const req = (body: unknown) =>
  new Request('http://localhost/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

describe('routes read bindings via getCloudflareContext', () => {
  beforeEach(() => {
    rl.allowed = true;
  });

  it('waitlist inserts into env.DB', async () => {
    const { db, runs } = mockDB();
    ctx.env = { DB: db };
    const res = await waitlistPOST(req({ email: 'a@example.com', deviceId: 'd1' }));
    expect(res.status).toBe(201);
    expect(runs[0][0]).toBe('a@example.com');
  });

  it('waitlist rate-limits per IP', async () => {
    ctx.env = { DB: mockDB(5).db };
    const res = await waitlistPOST(req({ email: 'a@example.com', deviceId: 'd1' }));
    expect(res.status).toBe(429);
  });

  it('plan without LLM key streams template weeks and ends with done', async () => {
    ctx.env = { DB: mockDB().db };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const res = await planPOST(req({ trackId: 'tech-self-taught', answers: { weeklyHours: 10 }, deviceId: 'd1' }));
    expect(res.status).toBe(200);
    const lines = (await res.text()).trim().split('\n').map(l => JSON.parse(l));
    expect(lines.filter(l => l.type === 'week' && l.source === 'template')).toHaveLength(12);
    expect(lines.at(-1)).toEqual({ type: 'done', fallbackWeeks: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] });
    expect(lines.some(l => l.type === 'error')).toBe(false);
    const events = warn.mock.calls.map(c => JSON.parse(String(c[0])).event);
    expect(events.filter(e => e === 'llm_not_configured')).toHaveLength(1);
    warn.mockRestore();
  });

  it.each(['device', 'ip'] as const)('plan 429 body matches RateLimitError with limit=%s and logs rate_limited', async (limit) => {
    rl.allowed = false;
    rl.limit = limit;
    ctx.env = { DB: mockDB().db };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const res = await planPOST(req({ trackId: 'tech-self-taught', answers: { weeklyHours: 10 }, deviceId: 'd1' }));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(RateLimitError.parse(body)).toEqual({ error: 'Rate limit exceeded', limit, remaining: 0, resetAt: '2026-10-12T16:00:00.000Z' });
    expect(JSON.parse(String(warn.mock.calls[0][0]))).toMatchObject({ event: 'rate_limited', limit });
    warn.mockRestore();
  });

  it('plan rejects missing weeklyHours with 400', async () => {
    ctx.env = { DB: mockDB().db };
    const res = await planPOST(req({ trackId: 'tech-self-taught', answers: {}, deviceId: 'd1' }));
    expect(res.status).toBe(400);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

const ctx = vi.hoisted(() => ({ env: {} as Record<string, unknown> }));
vi.mock('@opennextjs/cloudflare', () => ({ getCloudflareContext: () => ({ env: ctx.env, cf: undefined, ctx: {} }) }));

const rl = vi.hoisted(() => ({ allowed: true }));
vi.mock('../lib/server/ratelimit', () => ({
  checkRateLimit: vi.fn(async () =>
    rl.allowed
      ? { allowed: true, remaining: 2, resetAt: '2026-10-12T16:00:00.000Z' }
      : { allowed: false, remaining: 0, resetAt: '2026-10-12T16:00:00.000Z' }
  ),
}));

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

  it('plan without LLM key streams template fallback + error line', async () => {
    ctx.env = { DB: mockDB().db };
    const res = await planPOST(req({ trackId: 'tech-self-taught', answers: { weeklyHours: 10 }, deviceId: 'd1' }));
    expect(res.status).toBe(200);
    const lines = (await res.text()).trim().split('\n').map(l => JSON.parse(l));
    expect(lines.filter(l => l.type === 'week' && l.source === 'template')).toHaveLength(12);
    expect(lines.at(-1)).toMatchObject({ type: 'error', fallbackWeeks: expect.any(Array) });
  });

  it('plan returns 429 with remaining/resetAt when limited', async () => {
    rl.allowed = false;
    ctx.env = { DB: mockDB().db };
    const res = await planPOST(req({ trackId: 'tech-self-taught', answers: { weeklyHours: 10 }, deviceId: 'd1' }));
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ remaining: 0, resetAt: expect.any(String) });
  });

  it('plan rejects missing weeklyHours with 400', async () => {
    ctx.env = { DB: mockDB().db };
    const res = await planPOST(req({ trackId: 'tech-self-taught', answers: {}, deviceId: 'd1' }));
    expect(res.status).toBe(400);
  });
});

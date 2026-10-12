import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit } from '../lib/server/ratelimit';
import type { Env } from '../lib/server/types';

// Mock D1Database
class MockD1Database implements D1Database {
  private counters: Map<string, number> = new Map();

  prepare(query: string): D1PreparedStatement {
    const self = this;
    let boundArgs: unknown[] = [];
    
    const stmt = {
      bind(...args: unknown[]): D1PreparedStatement {
        boundArgs = args;
        return stmt;
      },
      first: async <T = unknown>() => {
        const key = boundArgs[0] as string;
        const date = boundArgs[1] as string;
        const counterKey = `${key}:${date}`;
        
        // SELECT query - just read
        if (query.toUpperCase().includes('SELECT')) {
          const count = self.counters.get(counterKey) || 0;
          return (count > 0 ? { count } : null) as T;
        }
        
        // INSERT query - increment
        const currentCount = self.counters.get(counterKey) || 0;
        const newCount = currentCount + 1;
        self.counters.set(counterKey, newCount);
        
        return { count: newCount } as T;
      },
      run: async () => ({ success: true, meta: { changes: 1 } }),
    } as D1PreparedStatement;
    
    return stmt;
  }

  dump(): Promise<ArrayBuffer> {
    throw new Error('Not implemented');
  }

  async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
    // Simulate atomic batch execution by calling first() on each statement
    const results = await Promise.all(
      statements.map(async stmt => {
        const result = await stmt.first<{ count: number }>();
        return {
          success: true,
          results: [result],
          meta: { changes: 1 }
        } as D1Result<T>;
      })
    );
    
    return results;
  }

  exec(_query: string): Promise<D1ExecResult> {
    throw new Error('Not implemented');
  }

  withSession(_constraintOrBookmark?: string): D1DatabaseSession {
    throw new Error('Not implemented');
  }

  reset() {
    this.counters.clear();
  }
}

describe('checkRateLimit', () => {
  let mockDb: MockD1Database;
  let mockEnv: Env;

  beforeEach(() => {
    mockDb = new MockD1Database();
    mockEnv = {
      DB: mockDb,
      LLM_BASE_URL: 'https://example.com',
      LLM_API_KEY: 'test-key',
      RATE_LIMIT_PER_DEVICE_PER_DAY: '3',
      RATE_LIMIT_PER_IP_PER_DAY: '10',
    };
  });

  it('should allow first request', async () => {
    const result = await checkRateLimit(
      mockDb,
      'device-123',
      '192.168.1.1',
      mockEnv
    );

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThan(0);
    expect(result.resetAt).toBeDefined();
  });

  it('should track device request count', async () => {
    // First request
    const result1 = await checkRateLimit(mockDb, 'device-123', '192.168.1.1', mockEnv);
    expect(result1.allowed).toBe(true);
    expect(result1.count).toBe(1);

    // Second request
    const result2 = await checkRateLimit(mockDb, 'device-123', '192.168.1.1', mockEnv);
    expect(result2.allowed).toBe(true);
    expect(result2.count).toBe(2);

    // Third request
    const result3 = await checkRateLimit(mockDb, 'device-123', '192.168.1.1', mockEnv);
    expect(result3.allowed).toBe(true);
    expect(result3.count).toBe(3);
  });

  it('should block after exceeding device limit', async () => {
    // Make 3 requests (at the limit)
    await checkRateLimit(mockDb, 'device-123', '192.168.1.1', mockEnv);
    await checkRateLimit(mockDb, 'device-123', '192.168.1.1', mockEnv);
    await checkRateLimit(mockDb, 'device-123', '192.168.1.1', mockEnv);

    // Fourth request should be blocked
    // Counter is incremented atomically, then checked
    const result = await checkRateLimit(mockDb, 'device-123', '192.168.1.1', mockEnv);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.count).toBe(4);
  });

  it('should allow different devices independently', async () => {
    // Device 1 makes 3 requests
    await checkRateLimit(mockDb, 'device-1', '192.168.1.1', mockEnv);
    await checkRateLimit(mockDb, 'device-1', '192.168.1.1', mockEnv);
    await checkRateLimit(mockDb, 'device-1', '192.168.1.1', mockEnv);

    // Device 2 should still be allowed
    const result = await checkRateLimit(mockDb, 'device-2', '192.168.1.1', mockEnv);
    expect(result.allowed).toBe(true);
    expect(result.count).toBe(1);
  });

  it('should enforce IP limit', async () => {
    mockEnv.RATE_LIMIT_PER_IP_PER_DAY = '2';

    // First device
    await checkRateLimit(mockDb, 'device-1', '192.168.1.1', mockEnv);
    
    // Second device, same IP
    await checkRateLimit(mockDb, 'device-2', '192.168.1.1', mockEnv);

    // Third device, same IP - should be blocked by IP limit
    const result = await checkRateLimit(mockDb, 'device-3', '192.168.1.1', mockEnv);
    expect(result.allowed).toBe(false);
    expect(result.limit).toBe('ip');
    expect(result.remaining).toBe(0);
  });

  it('should calculate remaining requests correctly', async () => {
    // First request: remaining should be 2 (3 - 1)
    const result1 = await checkRateLimit(mockDb, 'device-123', '192.168.1.1', mockEnv);
    expect(result1.remaining).toBe(2);

    // Second request: remaining should be 1 (3 - 2)
    const result2 = await checkRateLimit(mockDb, 'device-123', '192.168.1.1', mockEnv);
    expect(result2.remaining).toBe(1);

    // Third request: remaining should be 0 (3 - 3)
    const result3 = await checkRateLimit(mockDb, 'device-123', '192.168.1.1', mockEnv);
    expect(result3.remaining).toBe(0);
  });

  it('should use default limits when env vars not set', async () => {
    const envWithoutLimits: Env = { 
      DB: mockDb,
      LLM_BASE_URL: 'https://example.com',
      LLM_API_KEY: 'test-key'
    };

    // Default device limit is 3
    await checkRateLimit(mockDb, 'device-123', '192.168.1.1', envWithoutLimits);
    await checkRateLimit(mockDb, 'device-123', '192.168.1.1', envWithoutLimits);
    const result = await checkRateLimit(mockDb, 'device-123', '192.168.1.1', envWithoutLimits);
    
    expect(result.allowed).toBe(true);
    expect(result.count).toBe(3);

    // Fourth should be blocked
    const blocked = await checkRateLimit(mockDb, 'device-123', '192.168.1.1', envWithoutLimits);
    expect(blocked.allowed).toBe(false);
  });

  it('should provide valid resetAt timestamp', async () => {
    const result = await checkRateLimit(mockDb, 'device-123', '192.168.1.1', mockEnv);
    
    const resetDate = new Date(result.resetAt);
    const now = new Date();
    
    expect(resetDate.getTime()).toBeGreaterThan(now.getTime());
    expect(resetDate.toISOString()).toBe(result.resetAt);
  });
});

describe('rate limit defaults', () => {
  it('defaults to device=3, ip=30 when env vars are unset', async () => {
    const counts = new Map<string, number>();
    const db = {
      prepare: () => ({ bind: (key: string) => ({ key }) }),
      batch: async (stmts: { key: string }[]) =>
        stmts.map(({ key }) => {
          counts.set(key, (counts.get(key) ?? 0) + 1);
          return { results: [{ count: counts.get(key) }] };
        }),
    } as unknown as D1Database;
    const env = {} as Env;
    for (let i = 0; i < 3; i++) expect((await checkRateLimit(db, 'dev', '1.1.1.1', env)).allowed).toBe(true);
    const dev = await checkRateLimit(db, 'dev', '1.1.1.1', env);
    expect(dev).toMatchObject({ allowed: false, limit: 'device' });
    // 4 IP hits so far; IP allows 30
    for (let i = 5; i <= 30; i++) expect((await checkRateLimit(db, `d${i}`, '1.1.1.1', env)).allowed).toBe(true);
    expect(await checkRateLimit(db, 'd31', '1.1.1.1', env)).toMatchObject({ allowed: false, limit: 'ip' });
  });
});


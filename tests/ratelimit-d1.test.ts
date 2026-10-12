/**
 * Real D1 concurrency tests
 * 
 * Tests atomic rate limiting behavior with real D1 database via getPlatformProxy
 * Run with: pnpm test:d1
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { checkRateLimit } from '../lib/server/ratelimit';
import type { Env } from '../lib/server/types';

let platform: Awaited<ReturnType<typeof getPlatformProxy<Env>>>;

beforeAll(async () => {
  platform = await getPlatformProxy<Env>({
    persist: { path: '.wrangler/state/v3' },
  });
  
  // Initialize schema (exec requires single line)
  await platform.env.DB.exec(
    'CREATE TABLE IF NOT EXISTS rate_limit_counters (key TEXT NOT NULL, date TEXT NOT NULL, count INTEGER DEFAULT 1, created_at INTEGER DEFAULT (strftime(\'%s\', \'now\')), updated_at INTEGER DEFAULT (strftime(\'%s\', \'now\')), PRIMARY KEY (key, date))'
  );
});

afterAll(async () => {
  await platform.dispose();
});

describe('Rate Limit - Real D1 Concurrency', () => {
  beforeEach(async () => {
    // Clean up before each test to avoid cross-contamination
    await platform.env.DB.prepare('DELETE FROM rate_limit_counters').run();
  });

  it('should enforce device rate limit atomically with 10 concurrent requests', async () => {
    const deviceId = 'concurrent-test-device';
    const mockEnv: Env = {
      DB: platform.env.DB,
      LLM_BASE_URL: 'https://example.com',
      LLM_API_KEY: 'test-key',
      RATE_LIMIT_PER_DEVICE_PER_DAY: '3',
      RATE_LIMIT_PER_IP_PER_DAY: '100' // High IP limit to isolate device test
    };

    // Fire 10 concurrent requests with same deviceId but different IPs
    const promises = Array.from({ length: 10 }, (_, i) =>
      checkRateLimit(platform.env.DB, deviceId, `192.168.1.${i}`, mockEnv)
    );

    const results = await Promise.all(promises);

    // Count allowed vs rejected
    const allowed = results.filter(r => r.allowed);
    const rejected = results.filter(r => !r.allowed);

    // Exactly 3 should be allowed, 7 rejected
    expect(allowed.length).toBe(3);
    expect(rejected.length).toBe(7);

    // All rejected should have 0 remaining
    rejected.forEach(r => {
      expect(r.remaining).toBe(0);
    });

    // Allowed requests should have decreasing remaining counts
    const remainingCounts = allowed.map(r => r.remaining).sort((a, b) => b - a);
    expect(remainingCounts).toEqual([2, 1, 0]);
  });

  it('should enforce IP rate limit atomically with 10 concurrent requests', async () => {
    const ipAddress = '192.168.1.100';
    const mockEnv: Env = {
      DB: platform.env.DB,
      LLM_BASE_URL: 'https://example.com',
      LLM_API_KEY: 'test-key',
      RATE_LIMIT_PER_DEVICE_PER_DAY: '100', // High device limit
      RATE_LIMIT_PER_IP_PER_DAY: '3'
    };

    // Fire 10 concurrent requests with same IP but different devices
    const promises = Array.from({ length: 10 }, (_, i) =>
      checkRateLimit(platform.env.DB, `device-${i}`, ipAddress, mockEnv)
    );

    const results = await Promise.all(promises);

    const allowed = results.filter(r => r.allowed);
    const rejected = results.filter(r => !r.allowed);

    expect(allowed.length).toBe(3);
    expect(rejected.length).toBe(7);
  });

  it('should increment counter for rejected requests', async () => {
    const deviceId = 'test-overflow';
    const mockEnv: Env = {
      DB: platform.env.DB,
      LLM_BASE_URL: 'https://example.com',
      LLM_API_KEY: 'test-key',
      RATE_LIMIT_PER_DEVICE_PER_DAY: '3',
      RATE_LIMIT_PER_IP_PER_DAY: '100'
    };

    // Make 3 requests (at limit)
    await checkRateLimit(platform.env.DB, deviceId, '192.168.1.1', mockEnv);
    await checkRateLimit(platform.env.DB, deviceId, '192.168.1.2', mockEnv);
    await checkRateLimit(platform.env.DB, deviceId, '192.168.1.3', mockEnv);

    // Make 2 more rejected requests
    // Optimistic locking means counter will increment even when rejected
    // This prevents TOCTOU race conditions in concurrent scenarios
    const result1 = await checkRateLimit(platform.env.DB, deviceId, '192.168.1.10', mockEnv);
    expect(result1.allowed).toBe(false);
    expect(result1.count).toBe(4);

    const result2 = await checkRateLimit(platform.env.DB, deviceId, '192.168.1.11', mockEnv);
    expect(result2.allowed).toBe(false);
    expect(result2.count).toBe(5);

    // Verify counter is exactly 5 in DB
    const counter = await platform.env.DB
      .prepare('SELECT count FROM rate_limit_counters WHERE key LIKE ? ORDER BY date DESC LIMIT 1')
      .bind(`device:${deviceId}`)
      .first<{ count: number }>();

    expect(counter?.count).toBe(5);
  });

  it('should increment both counters atomically even when rejected by IP', async () => {
    const ipAddress = '192.168.1.200';
    const mockEnv: Env = {
      DB: platform.env.DB,
      LLM_BASE_URL: 'https://example.com',
      LLM_API_KEY: 'test-key',
      RATE_LIMIT_PER_DEVICE_PER_DAY: '10',
      RATE_LIMIT_PER_IP_PER_DAY: '2'
    };

    // Fill IP limit
    await checkRateLimit(platform.env.DB, 'device-1', ipAddress, mockEnv);
    await checkRateLimit(platform.env.DB, 'device-2', ipAddress, mockEnv);

    // Try with new device (should be rejected by IP limit)
    const result = await checkRateLimit(platform.env.DB, 'device-3', ipAddress, mockEnv);
    expect(result.allowed).toBe(false);

    // Verify device-3 counter WAS incremented (optimistic locking)
    // Use Shanghai date like the rate limiter does
    const now = new Date();
    const shanghaiMs = now.getTime() + 8 * 60 * 60 * 1000;
    const shanghaiDate = new Date(shanghaiMs).toISOString().split('T')[0];
    
    const deviceCounter = await platform.env.DB
      .prepare('SELECT count FROM rate_limit_counters WHERE key = ? AND date = ?')
      .bind('device:device-3', shanghaiDate)
      .first<{ count: number }>();

    expect(deviceCounter?.count).toBe(1); // Device-3 has count = 1
  });
});

describe('Rate Limit - Environment Variable Parsing', () => {
  beforeEach(async () => {
    await platform.env.DB.prepare('DELETE FROM rate_limit_counters').run();
  });

  it('should use default when env var is NaN', async () => {
    const mockEnv: Env = {
      DB: platform.env.DB,
      LLM_BASE_URL: 'https://example.com',
      LLM_API_KEY: 'test-key',
      RATE_LIMIT_PER_DEVICE_PER_DAY: 'not-a-number',
      RATE_LIMIT_PER_IP_PER_DAY: '100'
    };

    // Default is 3, so 4th request should fail
    await checkRateLimit(platform.env.DB, 'test', '192.168.1.1', mockEnv);
    await checkRateLimit(platform.env.DB, 'test', '192.168.1.2', mockEnv);
    await checkRateLimit(platform.env.DB, 'test', '192.168.1.3', mockEnv);
    const result = await checkRateLimit(platform.env.DB, 'test', '192.168.1.4', mockEnv);

    expect(result.allowed).toBe(false);
  });

  it('should use default when env var is zero or negative', async () => {
    const mockEnv: Env = {
      DB: platform.env.DB,
      LLM_BASE_URL: 'https://example.com',
      LLM_API_KEY: 'test-key',
      RATE_LIMIT_PER_DEVICE_PER_DAY: '0',
      RATE_LIMIT_PER_IP_PER_DAY: '-5'
    };

    // Both should default to 3 and 10
    const result = await checkRateLimit(platform.env.DB, 'test', '192.168.1.1', mockEnv);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2); // 3 - 1 = 2
  });
});

describe('Rate Limit - Timezone Boundary Tests', () => {
  it('should calculate correct resetAt around 15:59Z/16:00Z boundary', async () => {
    // Mock Date to test boundary behavior
    const testCases = [
      { utc: '2026-10-12T15:59:00.000Z', expectedResetHour: 16 }, // Before 16:00 UTC
      { utc: '2026-10-12T16:00:00.000Z', expectedResetHour: 16 }, // Exactly 16:00 UTC
      { utc: '2026-10-12T16:01:00.000Z', expectedResetHour: 16 }  // After 16:00 UTC
    ];

    for (const { utc, expectedResetHour } of testCases) {
      const testDate = new Date(utc);
      const realNow = Date.now;
      global.Date.now = () => testDate.getTime();

      const mockEnv: Env = {
        DB: platform.env.DB,
        LLM_BASE_URL: 'https://example.com',
        LLM_API_KEY: 'test-key'
      };

      const result = await checkRateLimit(platform.env.DB, 'tz-test', '192.168.1.1', mockEnv);
      const resetDate = new Date(result.resetAt);

      // resetAt should be at 16:00 UTC (00:00 Shanghai next day)
      expect(resetDate.getUTCHours()).toBe(expectedResetHour);
      expect(resetDate.getUTCMinutes()).toBe(0);
      expect(resetDate.getUTCSeconds()).toBe(0);

      global.Date.now = realNow;
      
      // Clean up for next test
      await platform.env.DB.exec('DELETE FROM rate_limit_counters');
    }
  });
});

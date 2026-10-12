import type { Env, RateLimitResult } from '../types';

const DEFAULT_DEVICE_LIMIT = 3;
const DEFAULT_IP_LIMIT = 30;

function parseLimit(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed <= 0) return defaultValue;
  return parsed;
}

export async function checkRateLimit(
  db: D1Database,
  deviceId: string,
  ipAddress: string,
  env: Env
): Promise<RateLimitResult> {
  const deviceLimit = parseLimit(env.RATE_LIMIT_PER_DEVICE_PER_DAY, DEFAULT_DEVICE_LIMIT);
  const ipLimit = parseLimit(env.RATE_LIMIT_PER_IP_PER_DAY, DEFAULT_IP_LIMIT);
  
  const today = getShangHaiDate();
  const resetAt = getNextDayShangHai();

  const deviceKey = `device:${deviceId}`;
  const ipKey = `ip:${ipAddress}`;

  // Optimistically increment both counters atomically
  // This relies on INSERT...ON CONFLICT being atomic per key
  const results = await db.batch([
    db.prepare(
      `INSERT INTO rate_limit_counters (key, date, count, created_at, updated_at)
       VALUES (?, ?, 1, strftime('%s', 'now'), strftime('%s', 'now'))
       ON CONFLICT(key, date) DO UPDATE SET
         count = count + 1,
         updated_at = strftime('%s', 'now')
       RETURNING count`
    ).bind(deviceKey, today),
    db.prepare(
      `INSERT INTO rate_limit_counters (key, date, count, created_at, updated_at)
       VALUES (?, ?, 1, strftime('%s', 'now'), strftime('%s', 'now'))
       ON CONFLICT(key, date) DO UPDATE SET
         count = count + 1,
         updated_at = strftime('%s', 'now')
       RETURNING count`
    ).bind(ipKey, today)
  ]);

  const newDeviceCount = (results[0].results[0] as { count: number })?.count || 1;
  const newIpCount = (results[1].results[0] as { count: number })?.count || 1;

  // Check limits AFTER incrementing
  // If over limit, the request is rejected but counter remains incremented
  // This prevents TOCTOU race conditions
  if (newDeviceCount > deviceLimit) {
    return {
      allowed: false,
      limit: 'device',
      remaining: 0,
      resetAt,
      count: newDeviceCount
    };
  }

  if (newIpCount > ipLimit) {
    return {
      allowed: false,
      limit: 'ip',
      remaining: 0,
      resetAt,
      count: newIpCount
    };
  }

  const remaining = Math.min(deviceLimit - newDeviceCount, ipLimit - newIpCount);

  return {
    allowed: true,
    remaining,
    resetAt,
    count: newDeviceCount
  };
}

/**
 * Get current date in Asia/Shanghai timezone (YYYY-MM-DD)
 * UTC+8, no DST
 */
function getShangHaiDate(): string {
  const now = new Date();
  const utcMs = now.getTime();
  const shanghaiMs = utcMs + 8 * 60 * 60 * 1000;
  const shanghaiDate = new Date(shanghaiMs);
  return shanghaiDate.toISOString().split('T')[0];
}

/**
 * Get the exact instant of next 00:00 Asia/Shanghai as ISO string
 * Returns next midnight in Shanghai time, which is 16:00 UTC of current Shanghai date
 * (or 16:00 UTC of the next day if we're past 16:00 UTC today)
 */
function getNextDayShangHai(): string {
  // Get current Shanghai date (YYYY-MM-DD)
  const currentShDate = getShangHaiDate();
  
  // Calculate 00:00 tomorrow in Shanghai = 16:00 UTC today
  const [year, month, day] = currentShDate.split('-').map(Number);
  const tomorrowMidnightShUTC = Date.UTC(year, month - 1, day, 16, 0, 0, 0); // 16:00 UTC = 00:00 Shanghai
  
  return new Date(tomorrowMidnightShUTC).toISOString();
}

export async function cleanupOldCounters(db: D1Database, daysToKeep = 7): Promise<number> {
  // Calculate cutoff date in Shanghai timezone
  const now = new Date();
  const utcMs = now.getTime();
  const shanghaiMs = utcMs + 8 * 60 * 60 * 1000;
  const cutoffMs = shanghaiMs - (daysToKeep * 24 * 60 * 60 * 1000);
  const cutoffDate = new Date(cutoffMs);
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

  const result = await db
    .prepare('DELETE FROM rate_limit_counters WHERE date < ?')
    .bind(cutoffDateStr)
    .run();

  return result.meta?.changes || 0;
}

import type { Env, RateLimitResult } from '../types';

const DEFAULT_DEVICE_LIMIT = 3;
const DEFAULT_IP_LIMIT = 10;

export async function checkRateLimit(
  db: D1Database,
  deviceId: string,
  ipAddress: string,
  env: Env
): Promise<RateLimitResult> {
  const deviceLimit = parseInt(env.RATE_LIMIT_PER_DEVICE_PER_DAY || String(DEFAULT_DEVICE_LIMIT));
  const ipLimit = parseInt(env.RATE_LIMIT_PER_IP_PER_DAY || String(DEFAULT_IP_LIMIT));
  
  const today = getShangHaiDate();
  const resetAt = getNextDayShangHai();

  // Check device limit
  const deviceKey = `device:${deviceId}`;
  const deviceCount = await incrementCounter(db, deviceKey, today);
  
  if (deviceCount > deviceLimit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      count: deviceCount
    };
  }

  // Check IP limit
  const ipKey = `ip:${ipAddress}`;
  const ipCount = await incrementCounter(db, ipKey, today);
  
  if (ipCount > ipLimit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      count: ipCount
    };
  }

  const remaining = Math.min(deviceLimit - deviceCount, ipLimit - ipCount);

  return {
    allowed: true,
    remaining,
    resetAt,
    count: deviceCount
  };
}

async function incrementCounter(
  db: D1Database,
  key: string,
  date: string
): Promise<number> {
  const result = await db
    .prepare(
      `INSERT INTO rate_limit_counters (key, date, count, created_at, updated_at)
       VALUES (?, ?, 1, strftime('%s', 'now'), strftime('%s', 'now'))
       ON CONFLICT(key, date) DO UPDATE SET
         count = count + 1,
         updated_at = strftime('%s', 'now')
       RETURNING count`
    )
    .bind(key, date)
    .first<{ count: number }>();

  return result?.count || 1;
}

function getShangHaiDate(): string {
  // Get current UTC time and convert to Shanghai time (UTC+8)
  const now = new Date();
  const shanghaiTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return shanghaiTime.toISOString().split('T')[0];
}

function getNextDayShangHai(): string {
  const now = new Date();
  const shanghaiTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const tomorrow = new Date(shanghaiTime);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}

export async function cleanupOldCounters(db: D1Database, daysToKeep: number = 7): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

  const result = await db
    .prepare('DELETE FROM rate_limit_counters WHERE date < ?')
    .bind(cutoffDateStr)
    .run();

  return result.meta?.changes || 0;
}

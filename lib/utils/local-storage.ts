import { z } from 'zod';
import { PlanWeekData, PLAN_SCHEMA_VERSION, SubmitField } from '@/lib/shared/plan';

export type AnswerValue = string | number;

export interface GoalData {
  goalId: string;
  trackId: string;
  answers: Record<string, AnswerValue>;
  createdAt: number;
}

export interface CheckinData {
  weekIndex: number;
  goalId?: string;
  values: Partial<Record<SubmitField, string>>;
  timestamp: number;
}

export const StoredWeek = PlanWeekData.extend({
  index: z.number().int().min(0),
  source: z.enum(['ai', 'template']),
});
export type StoredWeek = z.infer<typeof StoredWeek>;

export const StoredPlan = z.object({
  schemaVersion: z.literal(PLAN_SCHEMA_VERSION),
  goalId: z.string().min(1),
  weeks: z.array(StoredWeek).min(1),
  savedAt: z.number(),
});
export type StoredPlan = z.infer<typeof StoredPlan>;

export type PlanLoadResult =
  | { status: 'empty' }
  | { status: 'outdated' }
  | { status: 'ok'; plan: StoredPlan };

const GOAL_KEY = 'learnflow_goal';
const PLAN_KEY = 'learnflow_plan';
const CHECKINS_KEY = 'learnflow_checkins';

function readJson(key: string): unknown {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

export function saveGoal(data: GoalData): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GOAL_KEY, JSON.stringify(data));
}

export function getGoal(): GoalData | null {
  const data = readJson(GOAL_KEY);
  return data && typeof data === 'object' ? (data as GoalData) : null;
}

export function savePlan(goalId: string, weeks: StoredWeek[]): void {
  if (typeof window === 'undefined') return;
  const plan: StoredPlan = { schemaVersion: PLAN_SCHEMA_VERSION, goalId, weeks, savedAt: Date.now() };
  localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
}

/** 读取并用 zod 校验本地计划；旧版本或损坏数据返回 outdated。 */
export function loadPlan(goalId?: string | null): PlanLoadResult {
  const data = readJson(PLAN_KEY);
  if (data === null) return { status: 'empty' };
  const parsed = StoredPlan.safeParse(data);
  if (!parsed.success) return { status: 'outdated' };
  if (goalId && parsed.data.goalId !== goalId) return { status: 'empty' };
  return { status: 'ok', plan: parsed.data };
}

export function clearPlan(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PLAN_KEY);
}

export function getCheckins(): CheckinData[] {
  const data = readJson(CHECKINS_KEY);
  return Array.isArray(data) ? (data as CheckinData[]) : [];
}

export function saveCheckin(checkin: CheckinData): void {
  if (typeof window === 'undefined') return;
  const checkins = getCheckins().filter((c) => c.weekIndex !== checkin.weekIndex);
  checkins.push(checkin);
  localStorage.setItem(CHECKINS_KEY, JSON.stringify(checkins));
}

export function getCheckinForWeek(weekIndex: number): CheckinData | undefined {
  return getCheckins().find((c) => c.weekIndex === weekIndex);
}

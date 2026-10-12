import type { RateLimitKind, PlanWeekData, WeeklyHours, NDJSONLine as SharedNDJSONLine } from '../shared/plan';

// Week data structure (schema v2) - single source of truth lives in lib/shared/plan.ts
export type WeekData = PlanWeekData;

// NDJSON response types
export type NDJSONLine = SharedNDJSONLine;

// Track configuration
export interface TrackConfig {
  trackId: string;
  name: string;
  description: string;
  prompt: string;
  /** Default template plan; also defines the AI week count when no selector is given. */
  templatePlan: PlanWeekData[];
  /** Optional deterministic tier selection by answers.weeklyHours. */
  selectTemplatePlan?: (weeklyHours: number) => PlanWeekData[];
}

// API request types
export type PlanAnswers = { weeklyHours: WeeklyHours } & Record<string, string | number>;
export interface PlanRequest {
  trackId: string;
  answers: PlanAnswers;
  deviceId: string;
  weeks?: number[];
  keptWeeks?: { index: number; title: string }[];
}

export interface WaitlistRequest {
  email?: string;
  feedback?: string;
  deviceId: string;
  page?: string;
}

// Rate limit result
export interface RateLimitResult {
  allowed: boolean;
  /** Which quota rejected the request (only when allowed=false) */
  limit?: RateLimitKind;
  remaining: number;
  resetAt: string;
  count?: number;
}

// Environment bindings
export interface Env {
  DB: D1Database;
  LLM_BASE_URL: string;
  LLM_API_KEY: string;
  LLM_MODEL?: string;
  RATE_LIMIT_PER_DEVICE_PER_DAY?: string;
  RATE_LIMIT_PER_IP_PER_DAY?: string;
}

/** Template plan for the request's weeklyHours tier; its length is the plan's week count. */
export function getTemplatePlan(track: TrackConfig, weeklyHours: number): PlanWeekData[] {
  return track.selectTemplatePlan ? track.selectTemplatePlan(weeklyHours) : track.templatePlan;
}

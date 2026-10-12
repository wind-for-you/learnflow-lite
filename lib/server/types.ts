// Week data structure
export interface WeekData {
  title: string;
  milestone: string;
  tasks: Task[];
  resources?: Resource[];
}

export interface Task {
  title: string;
  description: string;
  deliverable: string;
  acceptanceCriteria: string[];
  estimatedHours?: number;
  references?: Resource[];
}

export interface Resource {
  title: string;
  url: string;
  type?: 'doc' | 'video' | 'tutorial' | 'tool';
}

// NDJSON response types
export type NDJSONLine = 
  | { type: 'week'; index: number; data: WeekData; source: 'ai' | 'template' }
  | { type: 'done'; fallbackWeeks: number[] }
  | { type: 'error'; message: string; fallbackWeeks: number[] };

// Track configuration
export interface TrackConfig {
  trackId: string;
  name: string;
  description: string;
  prompt: string;
  templatePlan: WeekData[];
}

// API request types
export interface PlanRequest {
  trackId: string;
  answers: Record<string, string>;
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

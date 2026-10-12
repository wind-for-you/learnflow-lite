import type { ZodIssue } from 'zod';
import type { WeekData, PlanRequest, PlanAnswers, WaitlistRequest, TemplateWeek, LegacyTemplateWeek } from '../types';
import { PlanWeekData, WeeklyHours, type WeekRejectReason } from '../../shared/plan';

export const ALLOWED_WEEKLY_HOURS = [5, 10, 15, 20] as const;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ANSWER_LENGTH = 2000;
const MAX_EMAIL_LENGTH = 254;
const MAX_FEEDBACK_LENGTH = 5000;
const MAX_DEVICE_ID_LENGTH = 100;

export class ValidationError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validatePlanRequest(req: unknown): PlanRequest {
  if (!req || typeof req !== 'object') {
    throw new ValidationError('Invalid request body');
  }

  const reqObj = req as Record<string, unknown>;
  const { trackId, answers, deviceId, weeks, keptWeeks } = reqObj;

  if (!trackId || typeof trackId !== 'string') {
    throw new ValidationError('trackId is required and must be a string');
  }

  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    throw new ValidationError('answers is required and must be an object');
  }

  // Validate answer lengths
  const answersObj = answers as Record<string, unknown>;
  if (!WeeklyHours.safeParse(answersObj.weeklyHours).success) {
    throw new ValidationError('answers.weeklyHours is required and must be one of 5, 10, 15, 20');
  }
  for (const [key, value] of Object.entries(answersObj)) {
    if (key === 'weeklyHours') continue;
    if (typeof value !== 'string') {
      throw new ValidationError(`Answer for "${key}" must be a string`);
    }
    if (value.length > MAX_ANSWER_LENGTH) {
      throw new ValidationError(`Answer for "${key}" exceeds maximum length`);
    }
  }

  if (!deviceId || typeof deviceId !== 'string') {
    throw new ValidationError('deviceId is required and must be a string');
  }

  if (deviceId.length > MAX_DEVICE_ID_LENGTH) {
    throw new ValidationError('deviceId exceeds maximum length');
  }

  // Validate optional weeks array
  if (weeks !== undefined) {
    if (!Array.isArray(weeks)) {
      throw new ValidationError('weeks must be an array');
    }
    if (!weeks.every(w => typeof w === 'number' && Number.isInteger(w) && w >= 0)) {
      throw new ValidationError('weeks must contain non-negative integers');
    }
  }

  // Validate optional keptWeeks
  if (keptWeeks !== undefined) {
    if (!Array.isArray(keptWeeks)) {
      throw new ValidationError('keptWeeks must be an array');
    }
    for (const week of keptWeeks) {
      if (
        !week || 
        typeof week !== 'object' || 
        !('index' in week) || 
        !('title' in week) ||
        typeof week.index !== 'number' || 
        typeof week.title !== 'string'
      ) {
        throw new ValidationError('keptWeeks items must have index (number) and title (string)');
      }
    }
  }

  return { 
    trackId: trackId as string, 
    answers: answersObj as PlanAnswers, 
    deviceId: deviceId as string, 
    weeks: weeks as number[] | undefined, 
    keptWeeks: keptWeeks as { index: number; title: string }[] | undefined 
  };
}

export function validateWaitlistRequest(req: unknown): WaitlistRequest {
  if (!req || typeof req !== 'object') {
    throw new ValidationError('Invalid request body');
  }

  const reqObj = req as Record<string, unknown>;
  const { email, feedback, deviceId, page } = reqObj;

  if (!email && !feedback) {
    throw new ValidationError('At least one of email or feedback is required');
  }

  if (email !== undefined) {
    if (typeof email !== 'string') {
      throw new ValidationError('email must be a string');
    }
    if (!EMAIL_REGEX.test(email)) {
      throw new ValidationError('Invalid email format');
    }
    if (email.length > MAX_EMAIL_LENGTH) {
      throw new ValidationError('email exceeds maximum length');
    }
  }

  if (feedback !== undefined) {
    if (typeof feedback !== 'string') {
      throw new ValidationError('feedback must be a string');
    }
    if (feedback.length > MAX_FEEDBACK_LENGTH) {
      throw new ValidationError('feedback exceeds maximum length');
    }
  }

  if (!deviceId || typeof deviceId !== 'string') {
    throw new ValidationError('deviceId is required and must be a string');
  }

  if (deviceId.length > MAX_DEVICE_ID_LENGTH) {
    throw new ValidationError('deviceId exceeds maximum length');
  }

  if (page !== undefined && typeof page !== 'string') {
    throw new ValidationError('page must be a string');
  }

  return { email, feedback, deviceId, page };
}

export interface WeekValidationContext {
  /** 0-based week index */
  index: number;
  /** answers.weeklyHours (5|10|15|20; 20 means 20+) */
  weeklyHours: number;
}

export type WeekValidationResult =
  | { ok: true; data: WeekData }
  | { ok: false; reason: WeekRejectReason };

function issueToReason(issue: ZodIssue): WeekRejectReason {
  const field = issue.path[0];
  switch (field) {
    case 'deliverable':
      return 'missing_deliverable';
    case 'doneCriteria':
      return 'missing_done_criteria';
    case 'estimateHours':
      return 'bad_estimate';
    case 'firstStep':
      return 'missing_first_step';
    default:
      // title / submitFields / resources or non-object: structurally malformed output
      return 'json_parse';
  }
}

/**
 * Validate a model-produced week against PlanWeekData (schema v2) plus server-only rules:
 * - week 1 (index 0) must include firstStep
 * - estimateHours <= weeklyHours
 * - deliverable must not be vague (only 理解/了解/掌握/熟悉-style verbs with no concrete artifact)
 * Unknown keys (e.g. `index`) are stripped.
 */
export function validateWeekData(data: unknown, ctx: WeekValidationContext): WeekValidationResult {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, reason: 'json_parse' };
  }
  const parsed = PlanWeekData.safeParse(data);
  if (!parsed.success) {
    // Report the most relevant issue first: deliverable > doneCriteria > estimate > firstStep > other
    const order: WeekRejectReason[] = ['missing_deliverable', 'missing_done_criteria', 'bad_estimate', 'missing_first_step', 'json_parse'];
    const reasons = parsed.error.issues.map(issueToReason);
    const reason = order.find(r => reasons.includes(r)) ?? 'json_parse';
    return { ok: false, reason };
  }
  const week = parsed.data;
  if (isVagueDeliverable(week.deliverable)) {
    return { ok: false, reason: 'vague_deliverable' };
  }
  if (ctx.index === 0 && !week.firstStep) {
    return { ok: false, reason: 'missing_first_step' };
  }
  if (week.estimateHours > ctx.weeklyHours) {
    return { ok: false, reason: 'over_budget' };
  }
  return { ok: true, data: week };
}

const VAGUE_WORDS = ['理解', '了解', '掌握', '熟悉', '学习', '认识', '入门', 'learn', 'understand', 'familiarize', 'study', 'get familiar'];
const ARTIFACT_WORDS = [
  '部署', '上线', '提交', '链接', '仓库', '页面', '网页', '网站', '应用', 'app', '项目', '代码', '截图',
  '文档', '报告', '笔记', 'readme', '接口', 'api', '脚本', '组件', '测试', '简历', 'pr', 'demo', '作品',
  '实现', '写出', '做出', '编写', '构建', '搭建', '开发', '发布', '录制', '视频', '表格', '清单',
  'build', 'deploy', 'submit', 'ship', 'publish', 'write', 'create', 'implement', 'repo', 'link',
];

/** True when the deliverable only expresses learning (理解/了解/掌握/熟悉...) without a concrete artifact. */
export function isVagueDeliverable(deliverable: string): boolean {
  const lower = deliverable.toLowerCase();
  const hasVague = VAGUE_WORDS.some(w => lower.includes(w));
  if (!hasVague) return false;
  return !ARTIFACT_WORDS.some(w => (/^[a-z]+$/.test(w) ? new RegExp(`\\b${w}\\b`).test(lower) : lower.includes(w)));
}

function clip(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max);
}

function isLegacyWeek(week: TemplateWeek): week is LegacyTemplateWeek {
  return 'tasks' in week && Array.isArray((week as LegacyTemplateWeek).tasks);
}

/**
 * Convert a template week to a valid v2 PlanWeekData for the given context.
 * Legacy (v1) template copy is mapped mechanically (no copy rewrite); estimateHours is
 * clamped to weeklyHours and week 1 gets a default firstStep if missing.
 */
export function toPlanWeek(week: TemplateWeek, ctx: WeekValidationContext): WeekData {
  let base: WeekData;
  if (isLegacyWeek(week)) {
    const task = week.tasks[0];
    const refs = [...(week.resources ?? []), ...week.tasks.flatMap(t => t.references ?? [])]
      .slice(0, 3)
      .map(r => ({ title: r.title, url: r.url }));
    const criteria = (task?.acceptanceCriteria ?? [])
      .filter(c => c.trim().length >= 4)
      .slice(0, 3)
      .map(c => clip(c, 80));
    base = {
      title: clip(week.title, 30),
      deliverable: clip(task?.deliverable ?? week.milestone, 120),
      doneCriteria: criteria.length ? criteria : ['提交交付物链接'],
      submitFields: ['link'],
      estimateHours: Math.round(task?.estimatedHours ?? ctx.weeklyHours),
      ...(refs.length ? { resources: refs } : {}),
    };
  } else {
    base = { ...week };
  }
  base.estimateHours = Math.max(1, Math.min(base.estimateHours, ctx.weeklyHours, 40));
  if (ctx.index === 0 && !base.firstStep) {
    base.firstStep = { action: '注册 GitHub 账号并新建第一个仓库', minutes: 15 };
  }
  return PlanWeekData.parse(base);
}

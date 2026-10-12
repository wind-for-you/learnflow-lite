import { z } from 'zod';

export const SubmitField = z.enum(['text', 'link', 'number']);
export type SubmitField = z.infer<typeof SubmitField>;

export const PlanWeekData = z.object({
  title: z.string().min(1).max(30),
  deliverable: z.string().min(8).max(120),
  doneCriteria: z.array(z.string().min(4).max(80)).min(1).max(3),
  submitFields: z.array(SubmitField).min(1),
  estimateHours: z.number().int().min(1).max(40),
  firstStep: z.object({ action: z.string().min(4).max(60), minutes: z.number().int().min(5).max(30) }).optional(),
  resources: z.array(z.object({ title: z.string(), url: z.string().url() })).max(3).optional(),
});
export type PlanWeekData = z.infer<typeof PlanWeekData>;

export const PLAN_SCHEMA_VERSION = 2;

/** Allowed values for answers.weeklyHours (20 means 20+). */
export const WeeklyHours = z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(20)]);
export type WeeklyHours = z.infer<typeof WeeklyHours>;

export const WeekRejectReason = z.enum([
  'missing_deliverable',
  'missing_done_criteria',
  'vague_deliverable',
  'bad_estimate',
  'over_budget',
  'missing_first_step',
  'json_parse',
]);
export type WeekRejectReason = z.infer<typeof WeekRejectReason>;

// NDJSON line schemas
export const WeekLine = z.object({
  type: z.literal('week'),
  index: z.number().int().min(0),
  source: z.enum(['ai', 'template']),
  data: PlanWeekData,
});
export const DoneLine = z.object({
  type: z.literal('done'),
  fallbackWeeks: z.array(z.number().int().min(0)),
});
export const ErrorLine = z.object({
  type: z.literal('error'),
  message: z.string(),
  fallbackWeeks: z.array(z.number().int().min(0)),
});
export const NDJSONLine = z.discriminatedUnion('type', [WeekLine, DoneLine, ErrorLine]);
export type WeekLine = z.infer<typeof WeekLine>;
export type DoneLine = z.infer<typeof DoneLine>;
export type ErrorLine = z.infer<typeof ErrorLine>;
export type NDJSONLine = z.infer<typeof NDJSONLine>;

import { describe, it, expect } from 'vitest';
import {
  validatePlanRequest,
  validateWaitlistRequest,
  validateWeekData,
  isVagueDeliverable,
  toPlanWeek,
  ValidationError,
} from '../lib/server/validation';
import { PlanWeekData } from '../lib/shared/plan';
import { techSelfTaughtTrack } from '../config/tracks/server/tech-self-taught';

describe('validatePlanRequest', () => {
  it('should validate a correct plan request', () => {
    const request = {
      trackId: 'tech-self-taught',
      answers: {
        currentLevel: 'beginner',
        targetRole: 'frontend developer',
        weeklyHours: 10,
      },
      deviceId: 'device-123',
    };

    const result = validatePlanRequest(request);
    expect(result).toEqual(request);
  });

  it('should reject missing trackId', () => {
    const request = {
      answers: { level: 'beginner', weeklyHours: 10 },
      deviceId: 'device-123',
    };

    expect(() => validatePlanRequest(request)).toThrow(ValidationError);
    expect(() => validatePlanRequest(request)).toThrow('trackId is required');
  });

  it('should reject missing answers', () => {
    const request = {
      trackId: 'tech-self-taught',
      deviceId: 'device-123',
    };

    expect(() => validatePlanRequest(request)).toThrow(ValidationError);
    expect(() => validatePlanRequest(request)).toThrow('answers is required');
  });

  it('should reject missing deviceId', () => {
    const request = {
      trackId: 'tech-self-taught',
      answers: { level: 'beginner', weeklyHours: 10 },
    };

    expect(() => validatePlanRequest(request)).toThrow(ValidationError);
    expect(() => validatePlanRequest(request)).toThrow('deviceId is required');
  });

  it('should reject answer exceeding max length', () => {
    const request = {
      trackId: 'tech-self-taught',
      answers: {
        longAnswer: 'a'.repeat(2001),
        weeklyHours: 10,
      },
      deviceId: 'device-123',
    };

    expect(() => validatePlanRequest(request)).toThrow(ValidationError);
    expect(() => validatePlanRequest(request)).toThrow('exceeds maximum length');
  });

  it('should validate optional weeks array', () => {
    const request = {
      trackId: 'tech-self-taught',
      answers: { level: 'beginner', weeklyHours: 10 },
      deviceId: 'device-123',
      weeks: [0, 2, 5],
    };

    const result = validatePlanRequest(request);
    expect(result.weeks).toEqual([0, 2, 5]);
  });

  it('should reject invalid weeks array', () => {
    const request = {
      trackId: 'tech-self-taught',
      answers: { level: 'beginner', weeklyHours: 10 },
      deviceId: 'device-123',
      weeks: [0, -1, 5],
    };

    expect(() => validatePlanRequest(request)).toThrow(ValidationError);
    expect(() => validatePlanRequest(request)).toThrow('non-negative integers');
  });

  it('should validate keptWeeks array', () => {
    const request = {
      trackId: 'tech-self-taught',
      answers: { level: 'beginner', weeklyHours: 10 },
      deviceId: 'device-123',
      keptWeeks: [
        { index: 0, title: 'Week 1' },
        { index: 2, title: 'Week 3' },
      ],
    };

    const result = validatePlanRequest(request);
    expect(result.keptWeeks).toEqual(request.keptWeeks);
  });
});

describe('validateWaitlistRequest', () => {
  it('should validate request with email', () => {
    const request = {
      email: 'user@example.com',
      deviceId: 'device-123',
    };

    const result = validateWaitlistRequest(request);
    expect(result).toEqual(request);
  });

  it('should validate request with feedback', () => {
    const request = {
      feedback: 'Great product!',
      deviceId: 'device-123',
    };

    const result = validateWaitlistRequest(request);
    expect(result).toEqual(request);
  });

  it('should validate request with both email and feedback', () => {
    const request = {
      email: 'user@example.com',
      feedback: 'Great product!',
      deviceId: 'device-123',
      page: '/onboarding',
    };

    const result = validateWaitlistRequest(request);
    expect(result).toEqual(request);
  });

  it('should reject request with neither email nor feedback', () => {
    const request = {
      deviceId: 'device-123',
    };

    expect(() => validateWaitlistRequest(request)).toThrow(ValidationError);
    expect(() => validateWaitlistRequest(request)).toThrow('At least one of email or feedback');
  });

  it('should reject invalid email format', () => {
    const request = {
      email: 'not-an-email',
      deviceId: 'device-123',
    };

    expect(() => validateWaitlistRequest(request)).toThrow(ValidationError);
    expect(() => validateWaitlistRequest(request)).toThrow('Invalid email format');
  });

  it('should reject email exceeding max length', () => {
    const request = {
      email: 'a'.repeat(250) + '@example.com',
      deviceId: 'device-123',
    };

    expect(() => validateWaitlistRequest(request)).toThrow(ValidationError);
    expect(() => validateWaitlistRequest(request)).toThrow('email exceeds maximum length');
  });

  it('should reject feedback exceeding max length', () => {
    const request = {
      feedback: 'a'.repeat(5001),
      deviceId: 'device-123',
    };

    expect(() => validateWaitlistRequest(request)).toThrow(ValidationError);
    expect(() => validateWaitlistRequest(request)).toThrow('feedback exceeds maximum length');
  });

  it('should reject missing deviceId', () => {
    const request = {
      email: 'user@example.com',
    };

    expect(() => validateWaitlistRequest(request)).toThrow(ValidationError);
    expect(() => validateWaitlistRequest(request)).toThrow('deviceId is required');
  });
});

describe('validatePlanRequest weeklyHours', () => {
  const base = { trackId: 'tech-self-taught', deviceId: 'device-123' };
  it.each([5, 10, 15, 20])('accepts weeklyHours=%i', (h) => {
    expect(validatePlanRequest({ ...base, answers: { weeklyHours: h } }).answers.weeklyHours).toBe(h);
  });
  it.each([[undefined], [0], [8], [25], ['10'], [10.5]])('rejects weeklyHours=%s', (h) => {
    expect(() => validatePlanRequest({ ...base, answers: { weeklyHours: h } })).toThrow('weeklyHours');
  });
});

const goodWeek = (overrides: Record<string, unknown> = {}) => ({
  title: 'Week 1: Getting Started',
  deliverable: '部署个人主页到 GitHub Pages 并提交链接',
  doneCriteria: ['页面可公开访问', '包含自我介绍'],
  submitFields: ['link'],
  estimateHours: 6,
  firstStep: { action: '注册 GitHub 并新建仓库', minutes: 15 },
  resources: [{ title: 'MDN', url: 'https://developer.mozilla.org' }],
  ...overrides,
});
const ctx0 = { index: 0, weeklyHours: 10 };
const ctx1 = { index: 1, weeklyHours: 10 };

describe('validateWeekData (schema v2)', () => {
  it('accepts a valid week and strips unknown keys', () => {
    const result = validateWeekData({ index: 0, ...goodWeek() }, ctx0);
    expect(result).toEqual({ ok: true, data: goodWeek() });
  });

  it('accepts week > 1 without firstStep', () => {
    const { firstStep: _f, ...rest } = goodWeek();
    expect(validateWeekData(rest, ctx1).ok).toBe(true);
  });

  const rejects: [string, unknown, { index: number; weeklyHours: number }][] = [
    ['missing_deliverable', goodWeek({ deliverable: undefined }), ctx1],
    ['missing_deliverable', goodWeek({ deliverable: '太短' }), ctx1],
    ['missing_done_criteria', goodWeek({ doneCriteria: [] }), ctx1],
    ['missing_done_criteria', goodWeek({ doneCriteria: ['a1', 'b2', 'c3', 'd4'].map(x => x + '项检查') }), ctx1],
    ['vague_deliverable', goodWeek({ deliverable: '理解并掌握 JavaScript 的基本概念' }), ctx1],
    ['vague_deliverable', goodWeek({ deliverable: '了解和熟悉 React 生态' }), ctx1],
    ['bad_estimate', goodWeek({ estimateHours: 0 }), ctx1],
    ['bad_estimate', goodWeek({ estimateHours: 2.5 }), ctx1],
    ['bad_estimate', goodWeek({ estimateHours: 41 }), { index: 1, weeklyHours: 20 }],
    ['over_budget', goodWeek({ estimateHours: 12 }), ctx1],
    ['over_budget', goodWeek({ estimateHours: 6 }), { index: 1, weeklyHours: 5 }],
    ['missing_first_step', goodWeek({ firstStep: undefined }), ctx0],
    ['missing_first_step', goodWeek({ firstStep: { action: '注册 GitHub', minutes: 45 } }), ctx0],
    ['json_parse', null, ctx1],
    ['json_parse', 'not an object', ctx1],
    ['json_parse', goodWeek({ submitFields: [] }), ctx1],
  ];
  it.each(rejects)('rejects with %s', (reason, data, ctx) => {
    expect(validateWeekData(data, ctx)).toEqual({ ok: false, reason });
  });

  it('does not flag deliverable with concrete artifact as vague', () => {
    expect(isVagueDeliverable('理解闭包并写出 3 个示例代码提交仓库链接')).toBe(false);
    expect(isVagueDeliverable('掌握 Flexbox')).toBe(true);
  });
});

describe('toPlanWeek', () => {
  it('converts every real template week into valid v2 data for every weeklyHours', () => {
    for (const weeklyHours of [5, 10, 15, 20]) {
      techSelfTaughtTrack.templatePlan.forEach((week, index) => {
        const data = toPlanWeek(week, { index, weeklyHours });
        expect(PlanWeekData.safeParse(data).success).toBe(true);
        expect(data.estimateHours).toBeLessThanOrEqual(weeklyHours);
        if (index === 0) expect(data.firstStep).toBeDefined();
      });
    }
  });
});

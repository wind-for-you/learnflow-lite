import { describe, it, expect } from 'vitest';
import {
  validatePlanRequest,
  validateWaitlistRequest,
  validateWeekData,
  ValidationError,
} from '../lib/server/validation';

describe('validatePlanRequest', () => {
  it('should validate a correct plan request', () => {
    const request = {
      trackId: 'tech-self-taught',
      answers: {
        currentLevel: 'beginner',
        targetRole: 'frontend developer',
      },
      deviceId: 'device-123',
    };

    const result = validatePlanRequest(request);
    expect(result).toEqual(request);
  });

  it('should reject missing trackId', () => {
    const request = {
      answers: { level: 'beginner' },
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
      answers: { level: 'beginner' },
    };

    expect(() => validatePlanRequest(request)).toThrow(ValidationError);
    expect(() => validatePlanRequest(request)).toThrow('deviceId is required');
  });

  it('should reject answer exceeding max length', () => {
    const request = {
      trackId: 'tech-self-taught',
      answers: {
        longAnswer: 'a'.repeat(2001),
      },
      deviceId: 'device-123',
    };

    expect(() => validatePlanRequest(request)).toThrow(ValidationError);
    expect(() => validatePlanRequest(request)).toThrow('exceeds maximum length');
  });

  it('should validate optional weeks array', () => {
    const request = {
      trackId: 'tech-self-taught',
      answers: { level: 'beginner' },
      deviceId: 'device-123',
      weeks: [0, 2, 5],
    };

    const result = validatePlanRequest(request);
    expect(result.weeks).toEqual([0, 2, 5]);
  });

  it('should reject invalid weeks array', () => {
    const request = {
      trackId: 'tech-self-taught',
      answers: { level: 'beginner' },
      deviceId: 'device-123',
      weeks: [0, -1, 5],
    };

    expect(() => validatePlanRequest(request)).toThrow(ValidationError);
    expect(() => validatePlanRequest(request)).toThrow('non-negative integers');
  });

  it('should validate keptWeeks array', () => {
    const request = {
      trackId: 'tech-self-taught',
      answers: { level: 'beginner' },
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

describe('validateWeekData', () => {
  it('should validate correct week data', () => {
    const weekData = {
      title: 'Week 1: Getting Started',
      milestone: 'Complete first project',
      tasks: [
        {
          title: 'Build a website',
          description: 'Create a personal portfolio',
          deliverable: 'Build and deploy a portfolio website with 3 projects',
          acceptanceCriteria: [
            'Website is responsive',
            'Deployed to GitHub Pages',
          ],
          estimatedHours: 8,
          references: [
            { title: 'HTML Tutorial', url: 'https://example.com' },
          ],
        },
      ],
      resources: [
        { title: 'MDN', url: 'https://developer.mozilla.org' },
      ],
    };

    const result = validateWeekData(weekData);
    expect(result).toEqual(weekData);
  });

  it('should reject week data without title', () => {
    const weekData = {
      milestone: 'Complete first project',
      tasks: [
        {
          title: 'Build a website',
          description: 'Create a personal portfolio',
          deliverable: 'Build and deploy a portfolio website',
          acceptanceCriteria: ['Website is responsive'],
        },
      ],
    };

    const result = validateWeekData(weekData);
    expect(result).toBeNull();
  });

  it('should reject week data without milestone', () => {
    const weekData = {
      title: 'Week 1',
      tasks: [
        {
          title: 'Build a website',
          description: 'Create a personal portfolio',
          deliverable: 'Build and deploy a portfolio website',
          acceptanceCriteria: ['Website is responsive'],
        },
      ],
    };

    const result = validateWeekData(weekData);
    expect(result).toBeNull();
  });

  it('should reject week data without tasks', () => {
    const weekData = {
      title: 'Week 1',
      milestone: 'Complete first project',
      tasks: [],
    };

    const result = validateWeekData(weekData);
    expect(result).toBeNull();
  });

  it('should reject week data with vague deliverable', () => {
    const weekData = {
      title: 'Week 1',
      milestone: 'Learn JavaScript',
      tasks: [
        {
          title: 'Study JavaScript',
          description: 'Learn the basics',
          deliverable: 'Learn JavaScript basics',
          acceptanceCriteria: ['Understand variables', 'Understand functions'],
        },
      ],
    };

    const result = validateWeekData(weekData);
    expect(result).toBeNull();
  });

  it('should accept deliverable with "learn" if it includes "build"', () => {
    const weekData = {
      title: 'Week 1',
      milestone: 'First project',
      tasks: [
        {
          title: 'Learn by building',
          description: 'Build to learn',
          deliverable: 'Learn React by building and deploying a Todo app',
          acceptanceCriteria: ['App has CRUD features', 'Deployed online'],
        },
      ],
    };

    const result = validateWeekData(weekData);
    expect(result).not.toBeNull();
  });

  it('should reject task without acceptance criteria', () => {
    const weekData = {
      title: 'Week 1',
      milestone: 'First project',
      tasks: [
        {
          title: 'Build a website',
          description: 'Create a portfolio',
          deliverable: 'Build and deploy a portfolio website',
          acceptanceCriteria: [],
        },
      ],
    };

    const result = validateWeekData(weekData);
    expect(result).toBeNull();
  });

  it('should validate optional resources', () => {
    const weekData = {
      title: 'Week 1',
      milestone: 'First project',
      tasks: [
        {
          title: 'Build a website',
          description: 'Create a portfolio',
          deliverable: 'Build and deploy a portfolio website',
          acceptanceCriteria: ['Deployed online'],
        },
      ],
      resources: [
        { title: 'MDN', url: 'https://developer.mozilla.org' },
      ],
    };

    const result = validateWeekData(weekData);
    expect(result).toEqual(weekData);
  });

  it('should reject invalid resources', () => {
    const weekData = {
      title: 'Week 1',
      milestone: 'First project',
      tasks: [
        {
          title: 'Build a website',
          description: 'Create a portfolio',
          deliverable: 'Build and deploy a portfolio website',
          acceptanceCriteria: ['Deployed online'],
        },
      ],
      resources: [
        { title: 'MDN' }, // Missing url
      ],
    };

    const result = validateWeekData(weekData);
    expect(result).toBeNull();
  });
});

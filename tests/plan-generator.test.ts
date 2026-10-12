import { describe, it, expect } from 'vitest';
import { PlanGenerator } from '../lib/server/llm/plan-generator';
import { LLMClient } from '../lib/server/llm/client';
import { MockLLMClient, createMockWeekJSON, createInvalidWeekJSON } from './__mocks__/llm-client';
import type { TrackConfig, NDJSONLine } from '../lib/server/types';

// Type-safe access helpers
type WeekLine = Extract<NDJSONLine, { type: 'week' }>;
type DoneLine = Extract<NDJSONLine, { type: 'done' }>;
type ErrorLine = Extract<NDJSONLine, { type: 'error' }>;

function isWeekLine(line: NDJSONLine): line is WeekLine {
  return line.type === 'week';
}

function isDoneLine(line: NDJSONLine): line is DoneLine {
  return line.type === 'done';
}

function isErrorLine(line: NDJSONLine): line is ErrorLine {
  return line.type === 'error';
}

function getWeek(line: NDJSONLine): WeekLine {
  if (!isWeekLine(line)) throw new Error('Expected week line');
  return line;
}

function getDone(line: NDJSONLine): DoneLine {
  if (!isDoneLine(line)) throw new Error('Expected done line');
  return line;
}

function getError(line: NDJSONLine): ErrorLine {
  if (!isErrorLine(line)) throw new Error('Expected error line');
  return line;
}

const mockTrackConfig: TrackConfig = {
  trackId: 'test-track',
  name: 'Test Track',
  description: 'Test track for testing',
  prompt: 'Generate a test learning plan',
  templatePlan: [
    { title: 'Template Week 1', deliverable: 'Build and deploy a template project', doneCriteria: ['Criterion 1'], submitFields: ['link'], estimateHours: 6 },
    { title: 'Template Week 2', deliverable: 'Build and deploy another template project', doneCriteria: ['Criterion 1'], submitFields: ['link'], estimateHours: 6 },
    { title: 'Template Week 3', deliverable: 'Build and deploy a third template project', doneCriteria: ['Criterion 1'], submitFields: ['link'], estimateHours: 6 },
  ],
};

describe('PlanGenerator', () => {
  it('should generate plan from AI response', async () => {
    const mockClient = new MockLLMClient(false, [
      createMockWeekJSON(0) + '\n',
      createMockWeekJSON(1) + '\n',
      createMockWeekJSON(2),
    ]);

    const generator = new PlanGenerator(mockClient as unknown as LLMClient);
    const request = {
      trackId: 'test-track',
      answers: { level: 'beginner', weeklyHours: 10 as const },
      deviceId: 'device-123',
    };

    const results = [];
    for await (const line of generator.generatePlan(request, mockTrackConfig)) {
      results.push(line);
    }

    // Should have 3 weeks + 1 done message
    expect(results.length).toBe(4);
    
    // Check week lines
    expect(isWeekLine(results[0])).toBe(true);
    if (isWeekLine(results[0])) {
      expect(results[0].index).toBe(0);
      expect(results[0].source).toBe('ai');
    }
    
    expect(isWeekLine(results[1])).toBe(true);
    if (isWeekLine(results[1])) {
      expect(results[1].index).toBe(1);
      expect(results[1].source).toBe('ai');
    }
    
    expect(isWeekLine(results[2])).toBe(true);
    if (isWeekLine(results[2])) {
      expect(results[2].index).toBe(2);
      expect(results[2].source).toBe('ai');
    }
    
    // Check done line
    expect(isDoneLine(results[3])).toBe(true);
    if (isDoneLine(results[3])) {
      expect(results[3].fallbackWeeks).toEqual([]);
    }
  });

  it('should use template fallback for invalid AI weeks', async () => {
    const mockClient = new MockLLMClient(false, [
      createMockWeekJSON(0) + '\n',
      createInvalidWeekJSON(1) + '\n', // Invalid - will use template
      createMockWeekJSON(2),
    ]);

    const generator = new PlanGenerator(mockClient as unknown as LLMClient);
    const request = {
      trackId: 'test-track',
      answers: { level: 'beginner', weeklyHours: 10 as const },
      deviceId: 'device-123',
    };

    const results = [];
    for await (const line of generator.generatePlan(request, mockTrackConfig)) {
      results.push(line);
    }

    // Should have 3 weeks + 1 done message
    expect(results.length).toBe(4);
    
    // Week 0 from AI
    expect(results[0].type).toBe('week');
    expect(getWeek(results[0]).index).toBe(0);
    expect(getWeek(results[0]).source).toBe('ai');
    
    // Week 2 from AI
    expect(results[1].type).toBe('week');
    expect(getWeek(results[1]).index).toBe(2);
    expect(getWeek(results[1]).source).toBe('ai');
    
    // Week 1 from template (fallback)
    expect(results[2].type).toBe('week');
    expect(getWeek(results[2]).index).toBe(1);
    expect(getWeek(results[2]).source).toBe('template');
    expect(getWeek(results[2]).data.title).toBe('Template Week 2');
    
    // Check done line reports fallback
    expect(results[3].type).toBe('done');
    expect(getDone(results[3]).fallbackWeeks).toEqual([1]);
  });

  it('should handle LLM error and use all template weeks', async () => {
    const mockClient = new MockLLMClient(true); // Will throw error

    const generator = new PlanGenerator(mockClient as unknown as LLMClient);
    const request = {
      trackId: 'test-track',
      answers: { level: 'beginner', weeklyHours: 10 as const },
      deviceId: 'device-123',
    };

    const results = [];
    for await (const line of generator.generatePlan(request, mockTrackConfig)) {
      results.push(line);
    }

    // Should have 3 template weeks + 1 error message
    expect(results.length).toBe(4);
    
    // All weeks from template
    expect(results[0].type).toBe('week');
    expect(getWeek(results[0]).source).toBe('template');
    
    expect(results[1].type).toBe('week');
    expect(getWeek(results[1]).source).toBe('template');
    
    expect(results[2].type).toBe('week');
    expect(getWeek(results[2]).source).toBe('template');
    
    // Check error line
    expect(results[3].type).toBe('error');
    expect(getError(results[3]).message).toBeDefined();
    expect(getError(results[3]).fallbackWeeks).toEqual([0, 1, 2]);
  });

  it('should generate only specified weeks', async () => {
    const mockClient = new MockLLMClient(false, [
      createMockWeekJSON(1) + '\n',
      createMockWeekJSON(2),
    ]);

    const generator = new PlanGenerator(mockClient as unknown as LLMClient);
    const request = {
      trackId: 'test-track',
      answers: { level: 'beginner', weeklyHours: 10 as const },
      deviceId: 'device-123',
      weeks: [1, 2], // Only regenerate weeks 1 and 2
    };

    const results = [];
    for await (const line of generator.generatePlan(request, mockTrackConfig)) {
      results.push(line);
    }

    // Should only have 2 weeks + 1 done message
    expect(results.length).toBe(3);
    
    expect(results[0].type).toBe('week');
    expect(getWeek(results[0]).index).toBe(1);
    
    expect(results[1].type).toBe('week');
    expect(getWeek(results[1]).index).toBe(2);
    
    expect(results[2].type).toBe('done');
  });

  it('should handle partial stream with incomplete JSON', async () => {
    const mockClient = new MockLLMClient(false, [
      createMockWeekJSON(0) + '\n',
      '{"index": 1, "title": "Week', // Incomplete JSON
    ]);

    const generator = new PlanGenerator(mockClient as unknown as LLMClient);
    const request = {
      trackId: 'test-track',
      answers: { level: 'beginner', weeklyHours: 10 as const },
      deviceId: 'device-123',
    };

    const results = [];
    for await (const line of generator.generatePlan(request, mockTrackConfig)) {
      results.push(line);
    }

    // Should have 1 valid week + 2 template fallbacks + 1 done
    expect(results.length).toBe(4);
    
    // Week 0 from AI
    expect(results[0].type).toBe('week');
    expect(getWeek(results[0]).index).toBe(0);
    expect(getWeek(results[0]).source).toBe('ai');
    
    // Weeks 1 and 2 from template
    expect(results[1].type).toBe('week');
    expect(getWeek(results[1]).source).toBe('template');
    
    expect(results[2].type).toBe('week');
    expect(getWeek(results[2]).source).toBe('template');
    
    // Done with fallback weeks
    expect(results[3].type).toBe('done');
    expect(getDone(results[3]).fallbackWeeks).toContain(1);
    expect(getDone(results[3]).fallbackWeeks).toContain(2);
  });

  it('should handle streaming chunks that split JSON across boundaries', async () => {
    const weekJSON = createMockWeekJSON(0);
    const midpoint = Math.floor(weekJSON.length / 2);
    
    const mockClient = new MockLLMClient(false, [
      weekJSON.slice(0, midpoint),
      weekJSON.slice(midpoint) + '\n',
      createMockWeekJSON(1),
    ]);

    const generator = new PlanGenerator(mockClient as unknown as LLMClient);
    const request = {
      trackId: 'test-track',
      answers: { level: 'beginner', weeklyHours: 10 as const },
      deviceId: 'device-123',
    };

    const results = [];
    for await (const line of generator.generatePlan(request, mockTrackConfig)) {
      results.push(line);
    }

    // Should successfully parse both weeks even though first was split
    const weekResults = results.filter(isWeekLine);
    expect(weekResults.length).toBeGreaterThan(0);
    
    // Week 0 should be parsed correctly
    const week0 = weekResults.find(w => w.index === 0);
    expect(week0).toBeDefined();
    if (week0) {
      expect(week0.source).toBe('ai');
    }
  });
});

describe('PlanGenerator tier week count', () => {
  it('weeklyHours=5 uses the 5h split template length for fallback', async () => {
    const { techSelfTaughtTrack } = await import('../config/tracks/server/tech-self-taught');
    const { templatePlan5h } = await import('../config/tracks/server/tech-self-taught-templates');
    const generator = new PlanGenerator(new MockLLMClient(true) as unknown as LLMClient);
    const results: NDJSONLine[] = [];
    for await (const line of generator.generatePlan(
      { trackId: 'tech-self-taught', answers: { weeklyHours: 5 }, deviceId: 'd' },
      techSelfTaughtTrack
    )) results.push(line);
    const weeks = results.filter(isWeekLine);
    expect(weeks.length).toBe(templatePlan5h.length);
    expect(weeks.every(w => w.data.estimateHours <= 5)).toBe(true);
  });
});


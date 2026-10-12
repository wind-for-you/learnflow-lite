import { describe, it, expect } from 'vitest';
import { generateMockPlanStream, type PlanMessage } from '../plan-data';

describe('generateMockPlanStream', () => {
  it('应该生成指定数量的周计划', async () => {
    const messages: PlanMessage[] = [];
    const stream = generateMockPlanStream({
      trackId: 'tech-self-taught',
      answers: { weekly_hours: '10' },
    });

    for await (const message of stream) {
      messages.push(message);
    }

    const weekMessages = messages.filter((m) => m.type === 'week');
    expect(weekMessages.length).toBeGreaterThan(0);
    expect(messages[messages.length - 1]?.type).toBe('done');
  });

  it('应该在失败时返回 error 消息', async () => {
    const messages: PlanMessage[] = [];
    const stream = generateMockPlanStream(
      {
        trackId: 'tech-self-taught',
        answers: {},
      },
      true
    );

    for await (const message of stream) {
      messages.push(message);
    }

    expect(messages[0]?.type).toBe('error');
  });

  it('应该在超时时生成部分周并停止', async () => {
    const messages: PlanMessage[] = [];
    const stream = generateMockPlanStream(
      {
        trackId: 'tech-self-taught',
        answers: { weekly_hours: '10' },
      },
      false,
      true
    );

    for await (const message of stream) {
      messages.push(message);
    }

    const weekMessages = messages.filter((m) => m.type === 'week');
    expect(weekMessages.length).toBeLessThanOrEqual(3);
  });

  it('生成的周应该包含必需字段', async () => {
    const messages: PlanMessage[] = [];
    const stream = generateMockPlanStream({
      trackId: 'tech-self-taught',
      answers: { weekly_hours: '15' },
    });

    for await (const message of stream) {
      messages.push(message);
      if (message.type === 'week') {
        expect(message.data.title).toBeDefined();
        expect(message.data.milestone).toBeDefined();
        expect(message.data.topics).toBeInstanceOf(Array);
        expect(message.data.resources).toBeInstanceOf(Array);
        expect(message.data.practiceHours).toBeGreaterThan(0);
        expect(message.source).toMatch(/^(ai|template)$/);
      }
    }
  });
});

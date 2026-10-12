import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';

describe('/api/e Route Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.AMPLITUDE_API_KEY;
  });

  it('应该拒绝不在白名单的事件', async () => {
    const request = new NextRequest('http://localhost:3000/api/e', {
      method: 'POST',
      body: JSON.stringify({
        event_type: 'invalid_event',
        device_id: 'test-device',
        event_properties: {},
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Event not allowed');
  });

  it('应该接受白名单事件', async () => {
    const request = new NextRequest('http://localhost:3000/api/e', {
      method: 'POST',
      body: JSON.stringify({
        event_type: 'onboarding_start',
        device_id: 'test-device',
        event_properties: { clientTs: Date.now() },
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });

  it('应该限制请求体大小（通过 content-length 头）', async () => {
    const payload = {
      event_type: 'app_open',
      device_id: 'test',
      event_properties: {},
    };

    const mockRequest = {
      headers: {
        get: (name: string) => {
          if (name === 'content-length') {
            return '40000'; // 超过 32KB
          }
          return null;
        },
      },
      json: async () => payload,
    } as unknown as NextRequest;

    const response = await POST(mockRequest);
    expect(response.status).toBe(413);
    const data = await response.json();
    expect(data.error).toBe('Request too large');
  });

  it('应该验证必需字段', async () => {
    const invalidPayloads = [
      {}, 
      { event_type: 'app_open' },
      { device_id: 'test' },
      { event_type: 'app_open', device_id: null },
    ];

    for (const payload of invalidPayloads) {
      const request = new NextRequest('http://localhost:3000/api/e', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBeGreaterThanOrEqual(400);
    }
  });

  it('缺少 AMPLITUDE_API_KEY 时应该静默跳过', async () => {
    const request = new NextRequest('http://localhost:3000/api/e', {
      method: 'POST',
      body: JSON.stringify({
        event_type: 'goal_created',
        device_id: 'test-device',
        event_properties: { goalId: 'test-123' },
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});

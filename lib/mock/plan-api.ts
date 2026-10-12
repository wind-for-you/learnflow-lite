import { generateMockPlanStream, type PlanMessage } from './plan-data';

export async function fetchPlanStream(
  requestBody: {
    trackId: string;
    answers: Record<string, string>;
    deviceId: string;
    weeks?: string[];
    keptWeeks?: string[];
  },
  onMessage: (message: PlanMessage) => void,
  onError: (error: Error) => void,
  onComplete: () => void
): Promise<void> {
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

  if (useMock) {
    try {
      const stream = generateMockPlanStream(requestBody);
      for await (const message of stream) {
        onMessage(message);
      }
      onComplete();
    } catch (error) {
      onError(error instanceof Error ? error : new Error('Unknown error'));
    }
    return;
  }

  try {
    const response = await fetch('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (response.status === 429) {
      const data = await response.json();
      onError(
        new Error(
          `请求过于频繁，剩余次数: ${data.remaining || 0}，重置时间: ${data.resetAt || '未知'}`
        )
      );
      return;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body');
    }

    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            const message = JSON.parse(line) as PlanMessage;
            onMessage(message);
          } catch (e) {
            console.error('Failed to parse message:', line, e);
          }
        }
      }
    }

    onComplete();
  } catch (error) {
    onError(error instanceof Error ? error : new Error('Network error'));
  }
}

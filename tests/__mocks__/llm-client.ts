import type { ChatMessage } from '../../lib/server/llm/client';

export class MockLLMClient {
  private shouldFail: boolean;
  private responseLines: string[];

  constructor(shouldFail = false, responseLines: string[] = []) {
    this.shouldFail = shouldFail;
    this.responseLines = responseLines;
  }

  async *streamChatCompletion(
    _messages: ChatMessage[],
    signal?: AbortSignal
  ): AsyncGenerator<string, void, unknown> {
    if (this.shouldFail) {
      throw new Error('Mock LLM error');
    }

    // Yield response lines with some delay to simulate streaming
    for (const line of this.responseLines) {
      if (signal?.aborted) {
        throw new Error('Aborted');
      }
      yield line;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
}

export function createMockWeek(index: number, overrides: Record<string, unknown> = {}) {
  return {
    index,
    title: `Week ${index + 1} Title`,
    deliverable: 'Build and deploy a working app with features X and Y, submit link',
    doneCriteria: ['Feature X is implemented', 'App is deployed online'],
    submitFields: ['link'],
    estimateHours: 8,
    ...(index === 0 ? { firstStep: { action: 'Create a GitHub repo', minutes: 15 } } : {}),
    resources: [{ title: 'Learning Resource', url: 'https://example.com/learn' }],
    ...overrides,
  };
}

export function createMockWeekJSON(index: number, overrides: Record<string, unknown> = {}): string {
  return JSON.stringify(createMockWeek(index, overrides));
}

export function createInvalidWeekJSON(index: number): string {
  return JSON.stringify({
    index,
    title: `Week ${index + 1}`,
    // Missing deliverable - will fail validation
    doneCriteria: [],
  });
}

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

export function createMockWeekJSON(index: number): string {
  return JSON.stringify({
    index,
    title: `Week ${index + 1} Title`,
    milestone: `Milestone for week ${index + 1}`,
    tasks: [
      {
        title: `Task for week ${index + 1}`,
        description: 'Build something concrete',
        deliverable: 'Build and deploy a working application with features X and Y',
        acceptanceCriteria: [
          'Feature X is implemented',
          'Feature Y works correctly',
          'Application is deployed online'
        ],
        estimatedHours: 8,
        references: [
          {
            title: 'Official Documentation',
            url: 'https://example.com/docs',
            type: 'doc'
          }
        ]
      }
    ],
    resources: [
      {
        title: 'Learning Resource',
        url: 'https://example.com/learn'
      }
    ]
  });
}

export function createInvalidWeekJSON(index: number): string {
  return JSON.stringify({
    index,
    title: `Week ${index + 1}`,
    // Missing milestone - will fail validation
    tasks: []
  });
}

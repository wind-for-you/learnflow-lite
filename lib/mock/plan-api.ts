import { NDJSONLine } from '@/lib/shared/plan';
import {
  generateMockPlanStream,
  getTemplateWeek,
  getTotalWeeks,
  getWeeklyHours,
  type MockScenario,
  type PlanMessage,
  type PlanStreamRequest,
} from './plan-data';

export type PlanErrorKind = 'not_found' | 'rate_limited' | 'offline' | 'server' | 'stream';

export class PlanRequestError extends Error {
  readonly kind: PlanErrorKind;
  readonly resetAt?: string;

  constructor(kind: PlanErrorKind, message: string, resetAt?: string) {
    super(message);
    this.name = 'PlanRequestError';
    this.kind = kind;
    this.resetAt = resetAt;
  }
}

export const TEMPLATE_FALLBACK_LABEL = '先用模板计划开始';

/** 客户端可模拟的场景（仅 mock 模式）：用于演示与 E2E。 */
export type ClientScenario = MockScenario | 'not_found' | 'rate_limited' | 'offline';

export function isMockEnabled(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCK === 'true';
}

export interface PlanStreamOptions {
  /** 仅在 mock 模式下生效。 */
  scenario?: ClientScenario;
  /** mock 每周的模拟延迟（毫秒）。 */
  mockStepMs?: number;
}

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

async function readRateLimit(response: Response): Promise<string | undefined> {
  try {
    const data: unknown = await response.json();
    if (data && typeof data === 'object' && 'resetAt' in data) {
      const { resetAt } = data as { resetAt?: unknown };
      return typeof resetAt === 'string' ? resetAt : undefined;
    }
  } catch {
    // 响应体不是 JSON，忽略
  }
  return response.headers.get('Retry-After') ?? undefined;
}

async function* realStream(request: PlanStreamRequest): AsyncGenerator<PlanMessage, void, unknown> {
  let response: Response;
  try {
    response = await fetch('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  } catch {
    throw new PlanRequestError(
      isOffline() ? 'offline' : 'server',
      isOffline() ? '网络已断开' : '无法连接服务器'
    );
  }

  if (response.status === 404) {
    throw new PlanRequestError('not_found', '计划服务暂不可用 (404)');
  }
  if (response.status === 429) {
    const resetAt = await readRateLimit(response);
    // TODO(#5): 改为解析 lib/shared/plan.ts 中的 RateLimitError { limit, remaining, resetAt }
    throw new PlanRequestError('rate_limited', '今天的次数用完了，北京时间 0 点恢复', resetAt);
  }
  if (!response.ok || !response.body) {
    throw new PlanRequestError('server', `服务器错误 (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = NDJSONLine.safeParse(JSON.parse(line));
          if (parsed.success) yield parsed.data;
        } catch {
          // 坏行忽略，缺失的周会由模板补齐
        }
      }
    }
  } catch {
    throw new PlanRequestError(isOffline() ? 'offline' : 'stream', isOffline() ? '网络已断开' : '数据流中断');
  }
}

async function* mockStream(
  request: PlanStreamRequest,
  options: PlanStreamOptions
): AsyncGenerator<PlanMessage, void, unknown> {
  const scenario = options.scenario ?? 'ok';
  if (scenario === 'offline' || isOffline()) {
    throw new PlanRequestError('offline', '网络已断开');
  }
  if (scenario === 'not_found') {
    throw new PlanRequestError('not_found', '计划服务暂不可用 (404)');
  }
  if (scenario === 'rate_limited') {
    throw new PlanRequestError('rate_limited', '今天的次数用完了，北京时间 0 点恢复');
  }
  yield* generateMockPlanStream(request, scenario, options.mockStepMs);
}

/**
 * 拉取计划流。无论成功或失败都会调用 onComplete（结束 loading）。
 * 出错或流提前结束时，用模板周补齐尚未收到的周，并标记 source=template。
 */
export async function fetchPlanStream(
  request: PlanStreamRequest,
  onMessage: (message: PlanMessage) => void,
  onError: (error: PlanRequestError) => void,
  onComplete: (summary: { templateFilled: number[] }) => void,
  options: PlanStreamOptions = {}
): Promise<void> {
  const expected =
    request.weeks ?? Array.from({ length: getTotalWeeks(request.answers) }, (_, i) => i);
  const received = new Set<number>();

  try {
    const stream = isMockEnabled() ? mockStream(request, options) : realStream(request);
    for await (const message of stream) {
      if (message.type === 'week') received.add(message.index);
      onMessage(message);
    }
  } catch (error) {
    onError(
      error instanceof PlanRequestError ? error : new PlanRequestError('server', '生成失败')
    );
  }

  const weeklyHours = getWeeklyHours(request.answers);
  const missing = expected.filter((index) => !received.has(index));
  for (const index of missing) {
    onMessage({ type: 'week', index, source: 'template', data: getTemplateWeek(index, weeklyHours) });
  }
  onComplete({ templateFilled: missing });
}

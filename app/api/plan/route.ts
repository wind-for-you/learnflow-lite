import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { Env, NDJSONLine } from '../../../lib/server/types';
import { validatePlanRequest, ValidationError } from '../../../lib/server/validation';
import { checkRateLimit } from '../../../lib/server/ratelimit';
import { getTrackConfig } from '../../../config/tracks/server';
import { LLMClient } from '../../../lib/server/llm/client';
import { PlanGenerator } from '../../../lib/server/llm/plan-generator';

export async function POST(request: Request) {
  try {
    const env: Env = getCloudflareContext().env;
    // Parse request body
    const body = await request.json();
    const validatedRequest = validatePlanRequest(body);
    
    // Get track configuration
    const trackConfig = getTrackConfig(validatedRequest.trackId);
    if (!trackConfig) {
      return new Response(
        JSON.stringify({ error: 'Unknown trackId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get client IP
    const ip = request.headers.get('CF-Connecting-IP') || 
               request.headers.get('X-Forwarded-For')?.split(',')[0] || 
               'unknown';

    // Check rate limit BEFORE starting stream
    const rateLimit = await checkRateLimit(
      env.DB,
      validatedRequest.deviceId,
      ip,
      env
    );

    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          remaining: 0,
          resetAt: rateLimit.resetAt
        }),
        { 
          status: 429,
          headers: { 
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetAt
          }
        }
      );
    }

    // Create LLM client and plan generator
    const llmClient = new LLMClient(env, 60000);
    const generator = new PlanGenerator(llmClient);

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const line of generator.generatePlan(validatedRequest, trackConfig)) {
            const json = JSON.stringify(line) + '\n';
            controller.enqueue(encoder.encode(json));
          }
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          // Send error line before closing
          const errorLine: NDJSONLine = {
            type: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
            fallbackWeeks: []
          };
          controller.enqueue(encoder.encode(JSON.stringify(errorLine) + '\n'));
          controller.close();
        }
      },
      cancel() {
        generator.abort();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        'X-RateLimit-Reset': rateLimit.resetAt
      }
    });

  } catch (error) {
    if (error instanceof ValidationError) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: error.statusCode, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

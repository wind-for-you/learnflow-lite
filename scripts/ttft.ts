/**
 * Time-To-First-Token (TTFT) Measurement Script
 * 
 * Measures the time from request start to receiving the first validated week
 * from the LLM API. Runs 10 iterations and reports P50/P90 latencies.
 * 
 * Usage:
 *   LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1 \
 *   LLM_API_KEY=sk-your-key \
 *   npm run ttft
 */

import { LLMClient } from '../lib/server/llm/client';
import { PlanGenerator } from '../lib/server/llm/plan-generator';
import { validateWeekData } from '../lib/server/validation';
import type { Env, TrackConfig } from '../lib/server/types';

// Test configuration
const ITERATIONS = 10;
const TEST_TRACK: TrackConfig = {
  trackId: 'test-ttft',
  name: 'TTFT Test',
  description: 'Test track for TTFT measurement',
  prompt: 'Generate a simple 1-week learning plan for a beginner learning web development. Output only one JSON object representing the week.',
  templatePlan: [{
    title: 'Week 1: HTML Basics',
    milestone: 'Create first webpage',
    tasks: [{
      title: 'Build a personal page',
      description: 'Create an HTML page with your info',
      deliverable: 'Build and deploy a personal webpage to GitHub Pages',
      acceptanceCriteria: [
        'Page contains name and bio',
        'Deployed to GitHub Pages',
        'Accessible via URL'
      ]
    }]
  }]
};

async function measureTTFT(): Promise<number> {
  const env: Env = {
    DB: null as unknown as D1Database, // Not needed for TTFT test
    LLM_BASE_URL: process.env.LLM_BASE_URL || '',
    LLM_API_KEY: process.env.LLM_API_KEY || '',
    LLM_MODEL: process.env.LLM_MODEL || 'qwen-plus'
  };

  if (!env.LLM_BASE_URL || !env.LLM_API_KEY) {
    throw new Error('LLM_BASE_URL and LLM_API_KEY must be set');
  }

  const client = new LLMClient(env);
  const generator = new PlanGenerator(client);

  const startTime = performance.now();
  let firstValidWeekTime: number | null = null;

  try {
    for await (const line of generator.generatePlan(
      {
        trackId: 'test-ttft',
        answers: {
          level: 'beginner',
          goal: 'learn web development'
        },
        deviceId: 'ttft-test',
        weeks: [0] // Only generate one week
      },
      TEST_TRACK
    )) {
      if (line.type === 'week' && firstValidWeekTime === null) {
        // Validate that it's actually a valid week
        const validated = validateWeekData(line.data);
        if (validated) {
          firstValidWeekTime = performance.now();
          break; // Stop after first valid week
        }
      }
    }
  } catch (error) {
    console.error(`Error during generation: ${error}`);
    return -1;
  }

  if (firstValidWeekTime === null) {
    console.error('No valid week received');
    return -1;
  }

  return firstValidWeekTime - startTime;
}

function calculatePercentile(sorted: number[], percentile: number): number {
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index];
}

async function main() {
  console.log('🚀 Starting TTFT Measurement\n');
  console.log(`Model: ${process.env.LLM_MODEL || 'qwen-plus'}`);
  console.log(`Base URL: ${process.env.LLM_BASE_URL}`);
  console.log(`Iterations: ${ITERATIONS}\n`);
  console.log('━'.repeat(60));

  const measurements: number[] = [];

  for (let i = 0; i < ITERATIONS; i++) {
    process.stdout.write(`\rIteration ${i + 1}/${ITERATIONS}...`);
    
    const ttft = await measureTTFT();
    
    if (ttft > 0) {
      measurements.push(ttft);
      process.stdout.write(` ${ttft.toFixed(0)}ms`);
    } else {
      process.stdout.write(` FAILED`);
    }
    
    // Small delay between requests to avoid rate limiting
    if (i < ITERATIONS - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('\n' + '━'.repeat(60));

  if (measurements.length === 0) {
    console.error('\n❌ All measurements failed');
    process.exit(1);
  }

  const sorted = measurements.sort((a, b) => a - b);
  const p50 = calculatePercentile(sorted, 50);
  const p90 = calculatePercentile(sorted, 90);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;

  console.log('\n📊 Results:');
  console.log('━'.repeat(60));
  console.log(`Successful: ${measurements.length}/${ITERATIONS}`);
  console.log(`Min:        ${min.toFixed(0)} ms`);
  console.log(`P50:        ${p50.toFixed(0)} ms`);
  console.log(`P90:        ${p90.toFixed(0)} ms`);
  console.log(`Max:        ${max.toFixed(0)} ms`);
  console.log(`Average:    ${avg.toFixed(0)} ms`);
  console.log('━'.repeat(60));

  if (measurements.length < ITERATIONS) {
    console.log(`\n⚠️  ${ITERATIONS - measurements.length} measurements failed`);
  }

  console.log('\n✅ TTFT measurement complete\n');
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
}

export { measureTTFT };

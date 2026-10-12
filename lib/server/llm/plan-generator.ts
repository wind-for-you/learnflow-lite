import type { PlanRequest, TrackConfig, NDJSONLine } from '../types';
import { LLMClient } from './client';
import { validateWeekData, toPlanWeek } from '../validation';
import type { WeekRejectReason } from '../../shared/plan';

export class PlanGenerator {
  private client: LLMClient;
  private abortController: AbortController;

  constructor(client: LLMClient) {
    this.client = client;
    this.abortController = new AbortController();
  }

  abort() {
    this.abortController.abort();
  }

  async *generatePlan(
    request: PlanRequest,
    trackConfig: TrackConfig
  ): AsyncGenerator<NDJSONLine, void, unknown> {
    const { answers, weeks, keptWeeks } = request;
    const weeklyHours = Number(answers.weeklyHours);
    const totalWeeks = trackConfig.templatePlan.length;
    
    // Determine which weeks to generate
    const weeksToGenerate = weeks || Array.from({ length: totalWeeks }, (_, i) => i);
    const generatedWeeks = new Set<number>();

    // Build the prompt
    const prompt = this.buildPrompt(trackConfig, answers, weeksToGenerate, keptWeeks, totalWeeks, weeklyHours);
    
    const messages = [
      {
        role: 'system' as const,
        content: 'You are an expert career mentor creating practical learning roadmaps. Output ONLY valid JSON objects, one per line, following the exact schema provided.'
      },
      {
        role: 'user' as const,
        content: prompt
      }
    ];

    let contentBuffer = '';
    
    try {
      for await (const chunk of this.client.streamChatCompletion(messages, this.abortController.signal)) {
        contentBuffer += chunk;
        
        // Try to extract complete JSON lines
        const lines = contentBuffer.split('\n');
        
        // Keep the last incomplete line in the buffer
        contentBuffer = lines.pop() || '';
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          
          const out = this.processLine(trimmed, weeksToGenerate, generatedWeeks, weeklyHours);
          if (out) yield out;
        }
      }
      
      // Try to parse any remaining content
      if (contentBuffer.trim()) {
        const line = this.processLine(contentBuffer.trim(), weeksToGenerate, generatedWeeks, weeklyHours);
        if (line) yield line;
      }
      
      // Fill in any missing weeks with template
      const missingWeeks = weeksToGenerate.filter(i => !generatedWeeks.has(i));
      
      for (const index of missingWeeks) {
        if (index < trackConfig.templatePlan.length) {
          yield {
            type: 'week',
            index,
            data: toPlanWeek(trackConfig.templatePlan[index], { index, weeklyHours }),
            source: 'template'
          };
        }
      }
      
      yield {
        type: 'done',
        fallbackWeeks: missingWeeks
      };
      
    } catch (error) {
      // On error, fill all missing weeks with template
      const missingWeeks = weeksToGenerate.filter(i => !generatedWeeks.has(i));
      
      for (const index of missingWeeks) {
        if (index < trackConfig.templatePlan.length) {
          yield {
            type: 'week',
            index,
            data: toPlanWeek(trackConfig.templatePlan[index], { index, weeklyHours }),
            source: 'template'
          };
        }
      }
      
      yield {
        type: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        fallbackWeeks: missingWeeks
      };
    }
  }

  private get modelName(): string {
    const name = (this.client as { modelName?: unknown }).modelName;
    return typeof name === 'string' ? name : 'unknown';
  }

  private logReject(weekIndex: number | null, reason: WeekRejectReason) {
    console.warn(JSON.stringify({ event: 'week_rejected', weekIndex, reason, model: this.modelName }));
  }

  /** Parse + validate one model output line. Returns a week line, or null (rejected/ignored). */
  private processLine(
    raw: string,
    weeksToGenerate: number[],
    generatedWeeks: Set<number>,
    weeklyHours: number
  ): NDJSONLine | null {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/"index"\s*:\s*(\d+)/);
      this.logReject(m ? Number(m[1]) : null, 'json_parse');
      return null;
    }
    const index = (parsed as { index?: unknown } | null)?.index;
    if (typeof index !== 'number' || !weeksToGenerate.includes(index) || generatedWeeks.has(index)) {
      return null;
    }
    const result = validateWeekData(parsed, { index, weeklyHours });
    if (!result.ok) {
      this.logReject(index, result.reason);
      return null;
    }
    generatedWeeks.add(index);
    return { type: 'week', index, data: result.data, source: 'ai' };
  }

  private buildPrompt(
    trackConfig: TrackConfig,
    answers: Record<string, string | number>,
    weeksToGenerate: number[],
    keptWeeks: { index: number; title: string }[] | undefined,
    totalWeeks: number,
    weeklyHours: number
  ): string {
    let prompt = trackConfig.prompt + '\n\n';
    
    prompt += '## User Answers:\n';
    prompt += '```\n';  // Delimiter to treat answers as data
    for (const [key, value] of Object.entries(answers)) {
      // Escape any backticks in user input to prevent breaking delimiter
      const escapedValue = String(value).replace(/```/g, '\\`\\`\\`');
      prompt += `${key}: ${escapedValue}\n`;
    }
    prompt += '```\n\n';  // End delimiter
    
    if (keptWeeks && keptWeeks.length > 0) {
      prompt += '## Existing Week Titles (keep consistency):\n';
      prompt += '```\n';
      for (const week of keptWeeks) {
        // Escape backticks in user-provided titles
        const escapedTitle = week.title.replace(/```/g, '\\`\\`\\`');
        prompt += `Week ${week.index + 1}: ${escapedTitle}\n`;
      }
      prompt += '```\n\n';
    }
    
    prompt += `## Instructions:\n`;
    prompt += `Generate ${weeksToGenerate.length} weeks (indices: ${weeksToGenerate.join(', ')}) out of ${totalWeeks} total weeks.\n`;
    prompt += `Output ONLY valid JSON, one complete object per line.\n\n`;
    
    prompt += `The learner has ${weeklyHours} hours per week${weeklyHours >= 20 ? ' (20+)' : ''}.\n\n`;
    prompt += `Each line must be a complete JSON object with this exact structure (schema v2):\n`;
    prompt += `{"index":0,"title":"<=30 chars","deliverable":"concrete checkable artifact, 8-120 chars","doneCriteria":["1-3 checkable items, 4-80 chars each"],"submitFields":["link"],"estimateHours":${Math.min(weeklyHours, 8)},"firstStep":{"action":"4-60 chars","minutes":15},"resources":[{"title":"Resource name","url":"https://example.com"}]}\n\n`;
    prompt += `CRITICAL REQUIREMENTS:\n`;
    prompt += `1. "deliverable" MUST be a concrete artifact the learner submits (e.g. "部署个人主页到 GitHub Pages 并提交链接"). NEVER only 理解/了解/掌握/熟悉/learn/understand something\n`;
    prompt += `2. "doneCriteria": 1-3 objectively checkable items\n`;
    prompt += `3. "submitFields": non-empty subset of ["text","link","number"] describing what the learner submits\n`;
    prompt += `4. "estimateHours": integer from 1 to ${weeklyHours}; MUST NOT exceed ${weeklyHours}\n`;
    prompt += `5. Week 1 (index 0) MUST include "firstStep": an immediately actionable step with minutes between 5 and 30\n`;
    prompt += `6. "resources" optional, at most 3, real URLs (official docs, quality tutorials)\n`;
    prompt += `7. Output ONLY complete JSON objects, one per line, no markdown, no explanations\n\n`;
    
    prompt += `Start generating now. Output only JSON lines:`;
    
    return prompt;
  }
}

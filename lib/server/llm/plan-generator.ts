import type { PlanRequest, TrackConfig, NDJSONLine } from '../types';
import { LLMClient } from './client';
import { validateWeekData } from '../validation';

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
    const totalWeeks = trackConfig.templatePlan.length;
    
    // Determine which weeks to generate
    const weeksToGenerate = weeks || Array.from({ length: totalWeeks }, (_, i) => i);
    const generatedWeeks = new Set<number>();
    const failedWeeks = new Set<number>();

    // Build the prompt
    const prompt = this.buildPrompt(trackConfig, answers, weeksToGenerate, keptWeeks, totalWeeks);
    
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
          
          try {
            const weekData = JSON.parse(trimmed);
            const validated = validateWeekData(weekData);
            
            if (validated && typeof weekData.index === 'number' && weeksToGenerate.includes(weekData.index)) {
              generatedWeeks.add(weekData.index);
              yield {
                type: 'week',
                index: weekData.index,
                data: validated,
                source: 'ai'
              };
            } else {
              // Invalid week data, mark for fallback
              if (typeof weekData.index === 'number') {
                failedWeeks.add(weekData.index);
              }
            }
          } catch (e) {
            // Not valid JSON yet, might be incomplete
          }
        }
      }
      
      // Try to parse any remaining content
      if (contentBuffer.trim()) {
        try {
          const weekData = JSON.parse(contentBuffer.trim());
          const validated = validateWeekData(weekData);
          
          if (validated && typeof weekData.index === 'number' && weeksToGenerate.includes(weekData.index)) {
            generatedWeeks.add(weekData.index);
            yield {
              type: 'week',
              index: weekData.index,
              data: validated,
              source: 'ai'
            };
          } else {
            if (typeof weekData.index === 'number') {
              failedWeeks.add(weekData.index);
            }
          }
        } catch (e) {
          // Ignore incomplete JSON at the end
        }
      }
      
      // Fill in any missing weeks with template
      const missingWeeks = weeksToGenerate.filter(i => !generatedWeeks.has(i));
      
      for (const index of missingWeeks) {
        if (index < trackConfig.templatePlan.length) {
          yield {
            type: 'week',
            index,
            data: trackConfig.templatePlan[index],
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
            data: trackConfig.templatePlan[index],
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

  private buildPrompt(
    trackConfig: TrackConfig,
    answers: Record<string, string>,
    weeksToGenerate: number[],
    keptWeeks: { index: number; title: string }[] | undefined,
    totalWeeks: number
  ): string {
    let prompt = trackConfig.prompt + '\n\n';
    
    prompt += '## User Answers:\n';
    for (const [key, value] of Object.entries(answers)) {
      prompt += `${key}: ${value}\n`;
    }
    prompt += '\n';
    
    if (keptWeeks && keptWeeks.length > 0) {
      prompt += '## Existing Week Titles (keep consistency):\n';
      for (const week of keptWeeks) {
        prompt += `Week ${week.index + 1}: ${week.title}\n`;
      }
      prompt += '\n';
    }
    
    prompt += `## Instructions:\n`;
    prompt += `Generate ${weeksToGenerate.length} weeks (indices: ${weeksToGenerate.join(', ')}) out of ${totalWeeks} total weeks.\n`;
    prompt += `Output ONLY valid JSON, one complete object per line.\n\n`;
    
    prompt += `Each line must be a complete JSON object with this exact structure:\n`;
    prompt += `{\n`;
    prompt += `  "index": 0,\n`;
    prompt += `  "title": "Week title",\n`;
    prompt += `  "milestone": "What user achieves this week",\n`;
    prompt += `  "tasks": [\n`;
    prompt += `    {\n`;
    prompt += `      "title": "Task name",\n`;
    prompt += `      "description": "What and why",\n`;
    prompt += `      "deliverable": "Concrete hands-on output (e.g., 'Build and deploy a Todo List app with CRUD operations')",\n`;
    prompt += `      "acceptanceCriteria": ["Criterion 1", "Criterion 2"],\n`;
    prompt += `      "estimatedHours": 8,\n`;
    prompt += `      "references": [{"title": "Resource name", "url": "https://example.com", "type": "tutorial"}]\n`;
    prompt += `    }\n`;
    prompt += `  ],\n`;
    prompt += `  "resources": [{"title": "Resource name", "url": "https://example.com"}]\n`;
    prompt += `}\n\n`;
    
    prompt += `CRITICAL REQUIREMENTS:\n`;
    prompt += `1. Every week MUST have at least one task with a concrete deliverable - a hands-on project that can be built and shipped\n`;
    prompt += `2. NO vague items like "learn JavaScript basics" or "understand React concepts"\n`;
    prompt += `3. Week 1 Day 1 task must be doable in 30 minutes and immediately actionable\n`;
    prompt += `4. Each deliverable must be specific: "Build X with features Y and Z and deploy to platform P"\n`;
    prompt += `5. Include real URLs in references (official docs, quality tutorials)\n`;
    prompt += `6. Output ONLY complete JSON objects, one per line, no markdown, no explanations\n\n`;
    
    prompt += `Start generating now. Output only JSON lines:`;
    
    return prompt;
  }
}

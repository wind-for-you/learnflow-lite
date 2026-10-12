'use client';

import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import type { PlanWeekData } from '@/lib/shared/plan';

const clean = (text: string, max: number) => {
  const safe = text.replace(/["<>]/g, '');
  return safe.length > max ? `${safe.slice(0, max)}…` : safe;
};

interface RoadmapRendererProps {
  weeks: Array<Pick<PlanWeekData, 'title' | 'deliverable'> & { index: number }>;
}

export function RoadmapRenderer({ weeks }: RoadmapRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!containerRef.current || weeks.length === 0) return;

    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'strict',
    });

    const renderDiagram = async () => {
      try {
        const nodes = weeks
          .map((week, idx) => {
            const nodeId = `week${idx}`;
            const label = `第${idx + 1}周 ${clean(week.title, 30)}<br/>${clean(week.deliverable, 24)}`;
            return `  ${nodeId}["${label}"]`;
          })
          .join('\n');

        const connections = weeks
          .slice(0, -1)
          .map((_, idx) => `  week${idx} --> week${idx + 1}`)
          .join('\n');

        const diagram = `graph TD\n${nodes}\n${connections}`;
        
        const { svg } = await mermaid.render('roadmap', diagram);
        
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err) {
        console.error('Mermaid render error:', err);
        setError('路线图渲染失败');
      }
    };

    renderDiagram();
  }, [weeks]);

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 overflow-x-auto">
      <div ref={containerRef} className="min-w-0" />
    </div>
  );
}

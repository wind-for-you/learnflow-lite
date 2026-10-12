'use client';

import dynamic from 'next/dynamic';

const DemoCardsClient = dynamic(() => import('./demo-cards-client'), {
  ssr: false,
  loading: () => (
    <div className="grid gap-6 md:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="p-6 rounded-xl border border-gray-200 bg-white shadow-sm"
        >
          <div className="h-12 w-12 rounded-lg bg-gray-100 mb-4"></div>
          <div className="h-6 bg-gray-100 rounded mb-2"></div>
          <div className="h-4 bg-gray-100 rounded w-3/4"></div>
        </div>
      ))}
    </div>
  ),
});

export function DemoCards() {
  return <DemoCardsClient />;
}

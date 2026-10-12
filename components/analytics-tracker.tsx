'use client';

import { useEffect } from 'react';
import { trackEvent } from '@/lib/analytics/client';

export function AnalyticsTracker() {
  useEffect(() => {
    trackEvent('app_open');
  }, []);

  return null;
}

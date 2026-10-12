'use client';

import { getDeviceId } from '@/lib/utils/device-id';

type EventName =
  | 'onboarding_start'
  | 'goal_created'
  | 'plan_generated'
  | 'first_checkin'
  | 'app_open';

interface EventProps {
  [key: string]: string | number | boolean;
}

export async function trackEvent(
  eventName: EventName,
  props: EventProps = {}
): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const deviceId = getDeviceId();
    const payload = {
      event_type: eventName,
      device_id: deviceId,
      event_properties: {
        ...props,
        clientTs: Date.now(),
      },
    };

    await fetch('/api/e', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('Analytics error:', error);
  }
}

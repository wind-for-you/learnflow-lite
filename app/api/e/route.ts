import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_EVENTS = new Set([
  'onboarding_start',
  'goal_created',
  'plan_generated',
  'first_checkin',
  'app_open',
]);

const MAX_BODY_SIZE = 32 * 1024;

interface EventPayload {
  event_type: string;
  device_id: string;
  event_properties?: Record<string, unknown>;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
      return NextResponse.json(
        { error: 'Request too large' },
        { status: 413 }
      );
    }

    const body: unknown = await request.json();
    
    if (!isValidEventPayload(body)) {
      return NextResponse.json(
        { error: 'Invalid payload' },
        { status: 400 }
      );
    }

    const { event_type, device_id, event_properties } = body;

    if (!ALLOWED_EVENTS.has(event_type)) {
      return NextResponse.json(
        { error: 'Event not allowed' },
        { status: 400 }
      );
    }

    const amplitudeKey = process.env.AMPLITUDE_API_KEY;
    if (!amplitudeKey) {
      console.warn('AMPLITUDE_API_KEY not set, skipping analytics');
      return NextResponse.json({ success: true });
    }

    const amplitudePayload = {
      api_key: amplitudeKey,
      events: [
        {
          event_type,
          device_id,
          event_properties: event_properties || {},
          time: Date.now(),
        },
      ],
    };

    const response = await fetch('https://api2.amplitude.com/2/httpapi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(amplitudePayload),
    });

    if (!response.ok) {
      console.error('Amplitude API error:', await response.text());
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function isValidEventPayload(body: unknown): body is EventPayload {
  if (typeof body !== 'object' || body === null) {
    return false;
  }
  
  const payload = body as Record<string, unknown>;
  
  return (
    typeof payload.event_type === 'string' &&
    typeof payload.device_id === 'string' &&
    payload.event_type.length > 0 &&
    payload.device_id.length > 0
  );
}

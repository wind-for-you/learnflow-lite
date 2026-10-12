import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { Env } from '../../../lib/server/types';
import { validateWaitlistRequest, ValidationError } from '../../../lib/server/validation';

// Simple rate limiting for waitlist submissions
const WAITLIST_RATE_LIMIT_PER_IP_PER_HOUR = 5;

async function checkWaitlistRateLimit(db: D1Database, ip: string): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const oneHourAgo = now - 3600;
  
  const result = await db
    .prepare('SELECT COUNT(*) as count FROM waitlist WHERE ip_address = ? AND created_at > ?')
    .bind(ip, oneHourAgo)
    .first<{ count: number }>();
  
  return (result?.count || 0) < WAITLIST_RATE_LIMIT_PER_IP_PER_HOUR;
}

export async function POST(request: Request) {
  try {
    const env: Env = getCloudflareContext().env;
    // Parse and validate request
    const body = await request.json();
    const validated = validateWaitlistRequest(body);
    
    // Get client IP and user agent
    const ip = request.headers.get('CF-Connecting-IP') || 
               request.headers.get('X-Forwarded-For')?.split(',')[0] || 
               'unknown';
    const userAgent = request.headers.get('User-Agent') || '';

    // Check rate limit
    const allowed = await checkWaitlistRateLimit(env.DB, ip);
    if (!allowed) {
      return new Response(
        JSON.stringify({ 
          error: 'Too many submissions. Please try again later.' 
        }),
        { 
          status: 429, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // Insert into database
    await env.DB
      .prepare(
        `INSERT INTO waitlist (email, feedback, device_id, page, ip_address, user_agent, created_at)
         VALUES (?, ?, ?, ?, ?, ?, strftime('%s', 'now'))`
      )
      .bind(
        validated.email || null,
        validated.feedback || null,
        validated.deviceId,
        validated.page || null,
        ip,
        userAgent
      )
      .run();

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Thank you for your submission!' 
      }),
      { 
        status: 201, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    if (error instanceof ValidationError) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: error.statusCode, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    console.error('Waitlist submission error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}

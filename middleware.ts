import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const apiRateLimits = new Map<string, { count: number; resetTime: number }>();

const RATE_CONFIGS: Record<string, { windowMs: number; max: number }> = {
  'auth': { windowMs: 60000, max: 10 },
  'recommend': { windowMs: 60000, max: 30 },
  'ratings': { windowMs: 60000, max: 40 },
  'plan-my-day': { windowMs: 60000, max: 20 },
  'friends': { windowMs: 60000, max: 30 },
  'groups': { windowMs: 60000, max: 30 },
  'profile': { windowMs: 60000, max: 30 },
  'users': { windowMs: 60000, max: 20 },
};

function getClientIdentifier(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

function checkApiRateLimit(ip: string, route: string): { allowed: boolean; remaining: number; resetIn: number } {
  const config = RATE_CONFIGS[route] || { windowMs: 60000, max: 60 };
  const key = `${ip}:${route}`;
  const now = Date.now();

  if (now % 60000 < 1000) {
    for (const [k, v] of apiRateLimits.entries()) {
      if (now > v.resetTime) apiRateLimits.delete(k);
    }
  }

  const existing = apiRateLimits.get(key);

  if (!existing || now > existing.resetTime) {
    apiRateLimits.set(key, { count: 1, resetTime: now + config.windowMs });
    return { allowed: true, remaining: config.max - 1, resetIn: config.windowMs };
  }

  if (existing.count >= config.max) {
    return { allowed: false, remaining: 0, resetIn: existing.resetTime - now };
  }

  existing.count++;
  return { allowed: true, remaining: config.max - existing.count, resetIn: existing.resetTime - now };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/')) {
    const parts = pathname.split('/').filter(Boolean);
    const route = parts.length > 1 ? parts[1] : 'default';
    const ip = getClientIdentifier(request);
    const result = checkApiRateLimit(ip, route);

    if (!result.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again shortly.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(result.resetIn / 1000)),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Remaining', String(result.remaining));
    return response;
  }

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/auth') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res: response });

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = '/auth/login';
      return NextResponse.redirect(url);
    }

    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    return response;
  }
}

export const config = {
  matcher: [
    '/api/:path*',
    '/discover/:path*',
    '/decide/:path*',
    '/friends/:path*',
    '/groups/:path*',
    '/profile/:path*',
  ],
};

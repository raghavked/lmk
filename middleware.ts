import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/auth') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Create supabase client for middleware
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
    '/discover/:path*',
    '/decide/:path*',
    '/friends/:path*',
    '/groups/:path*',
    '/profile/:path*',
  ],
};

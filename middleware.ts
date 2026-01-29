import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes and static assets
  const publicRoutes = ['/auth/login', '/auth/signup', '/auth/callback', '/api'];
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow static files
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Create supabase client for middleware
  const response = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res: response });

  try {
    // Refresh session if needed
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Protect routes that require authentication
    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = '/auth/login';
      return NextResponse.redirect(url);
    }

    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    // On error, allow the request to proceed
    return response;
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)',
  ],
};

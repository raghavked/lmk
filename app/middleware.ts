import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  const publicRoutes = ['/auth/login', '/auth/signup', '/auth/callback'];
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Create supabase client for middleware
  const response = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res: response });

  try {
    // Get session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Temporarily disabled auth redirect to allow direct access to /discover
    // TODO: Re-enable after implementing proper authentication flow
    // if (!session && pathname.startsWith('/discover')) {
    //   const url = request.nextUrl.clone();
    //   url.pathname = '/auth/login';
    //   return NextResponse.redirect(url);
    // }

    // Redirect to discover if logged in and trying to access auth routes
    if (session && publicRoutes.some((route) => pathname.startsWith(route))) {
      const url = request.nextUrl.clone();
      url.pathname = '/discover';
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
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};

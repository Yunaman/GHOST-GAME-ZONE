import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { validateSessionToken } from '@/lib/auth';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets, public files, icons, favicon, manifest, and service worker
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/public') ||
    pathname.startsWith('/icon-') ||
    pathname === '/favicon.ico' ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname === '/ghost-payment-card.png' ||
    pathname === '/compiled-global.css'
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get('ghost_session');
  const isAuthenticated = sessionCookie?.value && validateSessionToken(sessionCookie.value);

  // If on login page and already authenticated -> redirect to floor '/'
  if (pathname === '/login') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // Protect all application routes ('/', '/history', '/reports', '/settings')
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/history/:path*',
    '/reports/:path*',
    '/settings/:path*',
  ],
};

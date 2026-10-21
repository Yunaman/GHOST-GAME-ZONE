import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { parseAndVerifySignedToken } from '@/lib/auth-token';

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
  const sessionToken = sessionCookie?.value || '';
  const payload = parseAndVerifySignedToken(sessionToken);
  const isAuthenticated = Boolean(payload && payload.account_status === 'ACTIVE');
  const isOwner = Boolean(payload && payload.role === 'OWNER');

  // If on login page and already authenticated
  if (pathname === '/login') {
    if (isAuthenticated) {
      if (isOwner) {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // Protect owner admin route '/admin'
  if (pathname.startsWith('/admin')) {
    if (!isAuthenticated || !isOwner) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // Protect all customer application routes ('/', '/history', '/reports', '/settings')
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
    '/admin/:path*',
    '/history/:path*',
    '/reports/:path*',
    '/settings/:path*',
  ],
};

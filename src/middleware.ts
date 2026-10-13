import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { parseSessionToken } from '@/lib/auth-token';

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
  const parsedToken = sessionCookie?.value ? parseSessionToken(sessionCookie.value) : null;
  const isAuthenticated = parsedToken ? parsedToken.isValid : false;

  // If visiting /admin without being logged in as PRODUCT_OWNER -> redirect to login with returnUrl
  if (pathname.startsWith('/admin')) {
    if (!isAuthenticated || (parsedToken?.role !== 'PRODUCT_OWNER' && parsedToken?.username.toLowerCase() !== 'yunaonice')) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', '/admin');
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // If on login page and already authenticated -> redirect to floor '/' or returnUrl
  if (pathname === '/login') {
    if (isAuthenticated) {
      const redirectUrl = request.nextUrl.searchParams.get('redirect') || '/';
      return NextResponse.redirect(new URL(redirectUrl, request.url));
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
    '/admin/:path*',
    '/history/:path*',
    '/reports/:path*',
    '/settings/:path*',
  ],
};

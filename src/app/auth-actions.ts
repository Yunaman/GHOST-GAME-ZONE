'use server';

import { cookies } from 'next/headers';
import { AUTH_COOKIE_NAME, verifyCredentials } from '@/lib/auth';
import { parseAndVerifySignedToken } from '@/lib/auth-token';
import { redirect } from 'next/navigation';

export async function loginAction(username: string, password: string) {
  try {
    const res = await verifyCredentials(username, password);
    if (!res.success || !res.token) {
      return { success: false, error: res.error || 'Invalid username or password' };
    }

    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE_NAME, res.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year persistent login
      path: '/',
    });

    const payload = parseAndVerifySignedToken(res.token);
    const isOwner = payload?.role === 'OWNER';

    return { success: true, redirectUrl: isOwner ? '/admin' : '/' };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Login failed' };
  }
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
  redirect('/login');
}

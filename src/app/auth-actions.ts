'use server';

import { cookies } from 'next/headers';
import { AUTH_COOKIE_NAME, verifyCredentials } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function loginAction(username: string, password: string) {
  try {
    const result = await verifyCredentials(username, password);
    if (!result.success || !result.token) {
      return { success: false, error: result.error || 'Invalid username or password' };
    }

    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE_NAME, result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year persistent login
      path: '/',
    });

    return { success: true, user: result.user };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Login failed' };
  }
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
  redirect('/login');
}

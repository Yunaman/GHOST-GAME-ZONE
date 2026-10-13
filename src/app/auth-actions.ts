'use server';

import { cookies } from 'next/headers';
import { AUTH_COOKIE_NAME, verifyCredentials, generateSessionToken } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function loginAction(username: string, password: string) {
  try {
    const isValid = await verifyCredentials(username, password);
    if (!isValid) {
      return { success: false, error: 'Invalid username or password' };
    }

    const token = generateSessionToken();
    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year persistent login
      path: '/',
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Login failed' };
  }
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
  redirect('/login');
}

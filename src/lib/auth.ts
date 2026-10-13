import { cookies } from 'next/headers';
import { User } from '@/types';

export const AUTH_COOKIE_NAME = 'ghost_session';

function getAdminUser(): string {
  return process.env.GHOST_ADMIN_USER || 'ghostvon';
}

function getAdminPassword(): string {
  return process.env.GHOST_ADMIN_PASSWORD || 'von$111';
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export function generateSessionToken(): string {
  const user = getAdminUser();
  const pass = getAdminPassword();
  const timestamp = '1775650000000'; // Stable epoch seed
  const signature = simpleHash(`${user}:${pass}:${timestamp}`);
  return `ghost_v2_${user}_${signature}`;
}

export function validateSessionToken(token: string): boolean {
  if (!token || !token.startsWith('ghost_v2_')) return false;
  const expectedToken = generateSessionToken();
  return token === expectedToken;
}

export async function getAuthUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(AUTH_COOKIE_NAME);
    if (!sessionCookie || !sessionCookie.value) {
      return null;
    }

    if (validateSessionToken(sessionCookie.value)) {
      return {
        id: 'u-1',
        username: getAdminUser(),
        display_name: `${getAdminUser()} (Owner)`,
        role: 'OWNER',
        created_at: new Date().toISOString(),
      };
    }
    return null;
  } catch (err) {
    return null;
  }
}

export async function verifyCredentials(u: string, p: string): Promise<boolean> {
  const validUser = getAdminUser();
  const validPass = getAdminPassword();
  return u.trim() === validUser && p === validPass;
}

export async function getCurrentUser(): Promise<User> {
  const user = await getAuthUser();
  if (user) return user;
  return {
    id: 'u-1',
    username: getAdminUser(),
    display_name: `${getAdminUser()} (Owner)`,
    role: 'OWNER',
    created_at: new Date().toISOString(),
  };
}

export function hasPermission(): boolean {
  return true;
}

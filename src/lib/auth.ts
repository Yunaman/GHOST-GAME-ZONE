import { cookies } from 'next/headers';
import crypto from 'crypto';
import { User, Tenant } from '@/types';
import { generateSignedToken, parseAndVerifySignedToken, SessionPayload } from '@/lib/auth-token';
import { isSupabaseConfigured, supabase } from '@/lib/db/supabase';
import { loadDb } from '@/lib/db/fs-db';

export const AUTH_COOKIE_NAME = 'ghost_session';

export function hashPassword(password: string): string {
  const salt = 'ghost_salt_2026';
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 32, 'sha256').toString('hex');
  return `pbkdf2$sha256$1000$${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;
  if (storedHash.startsWith('pbkdf2$sha256$')) {
    const computed = hashPassword(password);
    return computed === storedHash;
  }
  return password === storedHash;
}

export function getAdminUser(): string {
  return process.env.GHOST_ADMIN_USER || 'yunaonice';
}

export function getAdminPassword(): string {
  return process.env.GHOST_ADMIN_PASSWORD || 'yuna$1';
}

export function generateOwnerToken(): string {
  const adminUser = getAdminUser();
  const payload: SessionPayload = {
    username: adminUser,
    tenant_id: 't-owner',
    role: 'OWNER',
    account_status: 'ACTIVE',
    display_name: `${adminUser} (Owner)`,
    iat: Date.now(),
  };
  return generateSignedToken(payload);
}

export function generateCustomerToken(
  username: string,
  tenantId: string,
  displayName: string,
  accountStatus: 'ACTIVE' | 'SUSPENDED' = 'ACTIVE'
): string {
  const payload: SessionPayload = {
    username,
    tenant_id: tenantId,
    role: 'CUSTOMER',
    account_status: accountStatus,
    display_name: displayName,
    iat: Date.now(),
  };
  return generateSignedToken(payload);
}

export function validateSessionToken(token: string): boolean {
  const payload = parseAndVerifySignedToken(token);
  if (!payload) return false;
  return payload.account_status === 'ACTIVE';
}

export function getSessionPayload(token: string): SessionPayload | null {
  return parseAndVerifySignedToken(token);
}

export async function getAuthUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(AUTH_COOKIE_NAME);
    if (!sessionCookie || !sessionCookie.value) {
      return null;
    }

    const payload = parseAndVerifySignedToken(sessionCookie.value);
    if (!payload || payload.account_status !== 'ACTIVE') {
      return null;
    }

    return {
      id: payload.username === getAdminUser() ? 'u-owner' : `u-${payload.tenant_id}`,
      tenant_id: payload.tenant_id,
      username: payload.username,
      display_name: payload.display_name,
      role: payload.role,
      created_at: new Date(payload.iat).toISOString(),
    };
  } catch (err) {
    return null;
  }
}

export async function verifyCredentials(
  u: string,
  p: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  const trimmedUser = u.trim();

  // 1. Check Product Owner Credentials
  const validOwnerUser = getAdminUser();
  const validOwnerPass = getAdminPassword();
  if (trimmedUser === validOwnerUser && p === validOwnerPass) {
    const token = generateOwnerToken();
    return { success: true, token };
  }

  // 2. Check Customer Tenants in Database or FS DB
  if (isSupabaseConfigured && supabase) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('*')
      .eq('username', trimmedUser)
      .single();

    if (tenant) {
      if (tenant.account_status === 'SUSPENDED') {
        return { success: false, error: 'Account is suspended. Please contact admin.' };
      }

      if (verifyPassword(p, tenant.password_hash)) {
        const token = generateCustomerToken(
          tenant.username,
          tenant.id,
          tenant.name,
          tenant.account_status as 'ACTIVE' | 'SUSPENDED'
        );
        return { success: true, token };
      }
    }
  } else {
    // Local FileSystem DB Fallback
    const db = loadDb();
    const tenants = (db as any).tenants || [];
    const tenant = tenants.find((t: any) => t.username === trimmedUser);

    if (tenant) {
      if (tenant.account_status === 'SUSPENDED') {
        return { success: false, error: 'Account is suspended. Please contact admin.' };
      }
      if (verifyPassword(p, tenant.password_hash)) {
        const token = generateCustomerToken(
          tenant.username,
          tenant.id,
          tenant.name,
          tenant.account_status
        );
        return { success: true, token };
      }
    }
  }

  return { success: false, error: 'Invalid username or password' };
}

export async function getCurrentUser(): Promise<User> {
  const user = await getAuthUser();
  if (user) return user;
  const adminUser = getAdminUser();
  return {
    id: 'u-owner',
    tenant_id: 't-owner',
    username: adminUser,
    display_name: `${adminUser} (Owner)`,
    role: 'OWNER',
    created_at: new Date().toISOString(),
  };
}

export function hasPermission(): boolean {
  return true;
}

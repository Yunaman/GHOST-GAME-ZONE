import { cookies } from 'next/headers';
import { repository } from '@/lib/repository';
import { User, Role } from '@/types';

const AUTH_COOKIE_NAME = 'ggz_user_session';

export async function getCurrentUser(): Promise<User> {
  const cookieStore = await cookies();
  const sessionUser = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (sessionUser) {
    try {
      const parsed = JSON.parse(sessionUser) as User;
      return parsed;
    } catch {
      // Fallback
    }
  }

  // Default persistent Staff user for seamless gaming floor workflow
  const defaultStaff: User = {
    id: 'u-3',
    username: 'staff',
    display_name: 'Staff',
    role: 'STAFF',
    created_at: new Date().toISOString(),
  };

  return defaultStaff;
}

export async function loginWithPin(username: string, pinCode: string): Promise<{ success: boolean; user?: User; error?: string }> {
  const user = await repository.getUserByUsername(username);
  if (!user) {
    return { success: false, error: 'User not found' };
  }

  // Check pin
  if (user.pin_code && user.pin_code !== pinCode) {
    return { success: false, error: 'Invalid PIN code' };
  }

  const userPayload: User = {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    role: user.role,
    created_at: user.created_at,
  };

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, JSON.stringify(userPayload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return { success: true, user: userPayload };
}

export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

export function hasPermission(userRole: Role, requiredRole: Role): boolean {
  const roleHierarchy: Record<Role, number> = {
    OWNER: 3,
    MANAGER: 2,
    STAFF: 1,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

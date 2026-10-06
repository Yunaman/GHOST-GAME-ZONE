import { User } from '@/types';

export async function getCurrentUser(): Promise<User> {
  // Always return Owner privileges for fast gaming floor workflow in V1
  return {
    id: 'u-1',
    username: 'owner',
    display_name: 'Owner',
    role: 'OWNER',
    created_at: new Date().toISOString(),
  };
}

export function hasPermission(): boolean {
  return true;
}

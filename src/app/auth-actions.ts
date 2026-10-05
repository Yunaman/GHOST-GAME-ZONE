'use server';

import { loginWithPin, logoutUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function loginAction(username: string, pin: string) {
  const result = await loginWithPin(username, pin);
  if (result.success) {
    revalidatePath('/');
    revalidatePath('/reports');
    revalidatePath('/settings');
  }
  return result;
}

export async function logoutAction() {
  await logoutUser();
  revalidatePath('/');
}

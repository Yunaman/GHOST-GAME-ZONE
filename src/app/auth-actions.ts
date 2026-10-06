'use server';

import { revalidatePath } from 'next/cache';

export async function loginAction() {
  revalidatePath('/');
  return { success: true };
}

export async function logoutAction() {
  revalidatePath('/');
  return { success: true };
}

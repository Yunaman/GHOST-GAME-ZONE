'use server';

import { revalidatePath } from 'next/cache';
import { repository } from '@/lib/repository';

export async function getConsolesWithActiveSessionsAction() {
  try {
    const consoles = await repository.getConsoles();
    const settings = await repository.getSettings();

    const consolesWithSessions = await Promise.all(
      consoles.map(async (c) => {
        const active_session = await repository.getActiveSessionByConsoleId(c.id);
        return {
          console: c,
          active_session,
        };
      })
    );

    return { success: true, data: consolesWithSessions, settings };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to fetch console states' };
  }
}

export async function startSessionAction(consoleId: string, createdBy = 'Staff') {
  try {
    const session = await repository.startSession(consoleId, createdBy);
    revalidatePath('/');
    revalidatePath('/history');
    return { success: true, data: session };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to start session' };
  }
}

export async function addMatchAction(sessionId: string, idempotencyKey?: string) {
  try {
    const result = await repository.addMatch(sessionId, idempotencyKey);
    revalidatePath('/');
    revalidatePath('/history');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to add match' };
  }
}

export async function toggleMatchExtraTimeAction(sessionId: string, matchId: string) {
  try {
    const result = await repository.toggleMatchExtraTime(sessionId, matchId);
    revalidatePath('/');
    revalidatePath('/history');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to toggle extra time' };
  }
}

export async function undoLastMatchAction(sessionId: string) {
  try {
    const result = await repository.undoLastMatch(sessionId);
    revalidatePath('/');
    revalidatePath('/history');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to undo match' };
  }
}

export async function finishSessionAction(sessionId: string, paymentMethod: 'CASH' | 'TELEBIRR' | 'CBE', reference?: string) {
  try {
    const session = await repository.finishSession(sessionId, paymentMethod, reference);
    revalidatePath('/');
    revalidatePath('/history');
    revalidatePath('/reports');
    return { success: true, data: session };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to finish session' };
  }
}

export async function createAdjustmentAction(sessionId: string, adjustmentAmount: number, reason: string, createdBy = 'Manager') {
  try {
    const adjustment = await repository.createAdjustment(sessionId, adjustmentAmount, reason, createdBy);
    revalidatePath('/');
    revalidatePath('/history');
    revalidatePath(`/history/${sessionId}`);
    revalidatePath('/reports');
    return { success: true, data: adjustment };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to create adjustment' };
  }
}

export async function updateSettingsAction(fifaNormalPrice: number, fifaExtraTimePrice: number, currency: string) {
  try {
    const settings = await repository.updateSettings(fifaNormalPrice, fifaExtraTimePrice, currency);
    revalidatePath('/');
    revalidatePath('/settings');
    return { success: true, data: settings };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to update settings' };
  }
}

export async function updateConsoleNameAction(consoleId: string, name: string) {
  try {
    const updated = await repository.updateConsoleName(consoleId, name);
    revalidatePath('/');
    revalidatePath('/settings');
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to update console name' };
  }
}

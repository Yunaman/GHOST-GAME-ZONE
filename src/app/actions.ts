'use server';

import { revalidatePath } from 'next/cache';
import { repository } from '@/lib/repository';
import { getAuthUser } from '@/lib/auth';
import { isSupabaseConfigured, supabase } from '@/lib/db/supabase';

async function getValidatedTenantId(): Promise<string> {
  const user = await getAuthUser();
  if (!user) {
    throw new Error('Unauthenticated');
  }

  const tenantId = user.tenant_id || 't-original';

  // Verify account is not suspended in database
  if (isSupabaseConfigured && supabase && tenantId !== 't-owner') {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('account_status')
      .eq('id', tenantId)
      .single();

    if (tenant && tenant.account_status === 'SUSPENDED') {
      throw new Error('Account is suspended. Please contact admin.');
    }
  }

  return tenantId;
}

export async function getConsolesWithActiveSessionsAction() {
  try {
    const tenantId = await getValidatedTenantId();
    const consoles = await repository.getConsoles(tenantId);
    const settings = await repository.getSettings(tenantId);

    const activeConsoles = consoles.filter((c) => c.is_active !== false);

    const consolesWithSessions = await Promise.all(
      activeConsoles.map(async (c) => {
        const active_session = await repository.getActiveSessionByConsoleId(c.id, tenantId);
        return {
          console: c,
          active_session,
        };
      })
    );

    return { success: true, data: consolesWithSessions, settings, allConsoles: consoles };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to fetch console states' };
  }
}

export async function addConsoleAction() {
  try {
    const tenantId = await getValidatedTenantId();
    const newConsole = await repository.addConsole(tenantId);
    revalidatePath('/');
    revalidatePath('/settings');
    return { success: true, data: newConsole };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to add new TV station' };
  }
}

export async function toggleConsoleActiveAction(consoleId: string, isActive: boolean) {
  try {
    const tenantId = await getValidatedTenantId();
    const updated = await repository.toggleConsoleActive(consoleId, isActive, tenantId);
    revalidatePath('/');
    revalidatePath('/settings');
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to toggle TV status' };
  }
}

export async function startSessionAction(consoleId: string, createdBy = 'Staff', customSessionId?: string) {
  try {
    const tenantId = await getValidatedTenantId();
    const session = await repository.startSession(consoleId, createdBy, customSessionId, tenantId);
    revalidatePath('/');
    revalidatePath('/history');
    return { success: true, data: session };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to start session' };
  }
}

export async function addMatchAction(sessionId: string, idempotencyKey?: string) {
  try {
    const tenantId = await getValidatedTenantId();
    const result = await repository.addMatch(sessionId, idempotencyKey, tenantId);
    revalidatePath('/');
    revalidatePath('/history');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to add match' };
  }
}

export async function toggleMatchExtraTimeAction(sessionId: string, matchId: string) {
  try {
    const tenantId = await getValidatedTenantId();
    const result = await repository.toggleMatchExtraTime(sessionId, matchId, tenantId);
    revalidatePath('/');
    revalidatePath('/history');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to toggle extra time' };
  }
}

export async function undoLastMatchAction(sessionId: string) {
  try {
    const tenantId = await getValidatedTenantId();
    const result = await repository.undoLastMatch(sessionId, tenantId);
    revalidatePath('/');
    revalidatePath('/history');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to undo match' };
  }
}

export async function finishSessionAction(sessionId: string, paymentMethod: 'CASH' | 'TELEBIRR' | 'CBE', reference?: string) {
  try {
    const tenantId = await getValidatedTenantId();
    const session = await repository.finishSession(sessionId, paymentMethod, reference, tenantId);
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
    const tenantId = await getValidatedTenantId();
    const adjustment = await repository.createAdjustment(sessionId, adjustmentAmount, reason, createdBy, tenantId);
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
    const tenantId = await getValidatedTenantId();
    const settings = await repository.updateSettings(fifaNormalPrice, fifaExtraTimePrice, currency, tenantId);
    revalidatePath('/');
    revalidatePath('/settings');
    return { success: true, data: settings };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to update settings' };
  }
}

export async function updateConsoleNameAction(consoleId: string, name: string) {
  try {
    const tenantId = await getValidatedTenantId();
    const updated = await repository.updateConsoleName(consoleId, name, tenantId);
    revalidatePath('/');
    revalidatePath('/settings');
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to update console name' };
  }
}

export async function clearCompletedHistoryAction() {
  try {
    const tenantId = await getValidatedTenantId();
    const res = await repository.clearCompletedHistory(tenantId);
    revalidatePath('/');
    revalidatePath('/history');
    revalidatePath('/reports');
    return { success: true, deletedCount: res.deletedCount };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to clear history' };
  }
}

export async function resetReportsAction() {
  try {
    const tenantId = await getValidatedTenantId();
    const res = await repository.resetReports(tenantId);
    revalidatePath('/');
    revalidatePath('/history');
    revalidatePath('/reports');
    return { success: true, deletedCount: res.deletedCount };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to reset reports' };
  }
}

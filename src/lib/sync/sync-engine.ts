import { getSyncQueue, removeFromSyncQueue, idbGetAll, idbPut, idbGet } from '@/lib/db/idb';
import { supabase } from '@/lib/db/supabase';
import { Console, Session, Match, Payment, Settings } from '@/types';

export function notifyDataChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ghost_data_updated'));
  }
}

export function notifySyncStatus(isOnline: boolean, pendingCount: number) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ghost_sync_status', { detail: { isOnline, pendingCount } }));
  }
}

let isSyncing = false;

export async function processSyncQueue(): Promise<void> {
  if (typeof window === 'undefined' || !navigator.onLine || !supabase || isSyncing) {
    return;
  }

  isSyncing = true;
  try {
    const queue = await getSyncQueue();
    notifySyncStatus(navigator.onLine, queue.length);

    if (queue.length === 0) {
      isSyncing = false;
      return;
    }

    for (const item of queue) {
      try {
        switch (item.action) {
          case 'START_SESSION': {
            const { consoleId, createdBy, customSessionId } = item.payload;
            const insertPayload: any = {
              id: customSessionId,
              console_id: consoleId,
              game_type: 'FIFA',
              billing_type: 'MATCH_BASED',
              status: 'ACTIVE',
              total_amount: 0.00,
              payment_status: 'UNPAID',
              created_by: createdBy || 'Staff',
            };
            await supabase.from('sessions').upsert(insertPayload, { onConflict: 'id' });
            await supabase.from('consoles').update({ status: 'PLAYING' }).eq('id', consoleId);
            break;
          }

          case 'ADD_MATCH': {
            const { sessionId, matchId, matchNumber, basePrice, extraTime, extraTimePrice, totalPrice, idempotencyKey } = item.payload;
            await supabase.from('matches').upsert({
              id: matchId,
              session_id: sessionId,
              match_number: matchNumber,
              base_price: basePrice,
              extra_time: extraTime,
              extra_time_price: extraTimePrice,
              total_price: totalPrice,
              client_idempotency_key: idempotencyKey,
            }, { onConflict: 'id' });

            // Recalculate and update session total
            const { data: matches } = await supabase.from('matches').select('total_price').eq('session_id', sessionId);
            const total = (matches || []).reduce((acc: number, m: any) => acc + Number(m.total_price), 0);
            await supabase.from('sessions').update({ total_amount: total }).eq('id', sessionId);
            break;
          }

          case 'TOGGLE_EXTRA_TIME': {
            const { sessionId, matchId, extraTime, extraTimePrice, totalPrice } = item.payload;
            await supabase.from('matches').update({
              extra_time: extraTime,
              extra_time_price: extraTimePrice,
              total_price: totalPrice,
            }).eq('id', matchId);

            const { data: matches } = await supabase.from('matches').select('total_price').eq('session_id', sessionId);
            const total = (matches || []).reduce((acc: number, m: any) => acc + Number(m.total_price), 0);
            await supabase.from('sessions').update({ total_amount: total }).eq('id', sessionId);
            break;
          }

          case 'UNDO_MATCH': {
            const { sessionId, matchId } = item.payload;
            if (matchId) {
              await supabase.from('matches').delete().eq('id', matchId);
            }
            const { data: matches } = await supabase.from('matches').select('total_price').eq('session_id', sessionId);
            const total = (matches || []).reduce((acc: number, m: any) => acc + Number(m.total_price), 0);
            await supabase.from('sessions').update({ total_amount: total }).eq('id', sessionId);
            break;
          }

          case 'FINISH_SESSION': {
            const { sessionId, paymentMethod, reference, totalAmount, finishedAt, consoleId } = item.payload;
            await supabase.from('payments').upsert({
              session_id: sessionId,
              method: paymentMethod,
              amount: totalAmount,
              reference: reference || null,
            });

            await supabase.from('sessions').update({
              status: 'FINISHED',
              payment_status: 'PAID',
              finished_at: finishedAt || new Date().toISOString(),
              total_amount: totalAmount,
            }).eq('id', sessionId);

            if (consoleId) {
              await supabase.from('consoles').update({ status: 'AVAILABLE' }).eq('id', consoleId);
            }
            break;
          }

          case 'CLEAR_HISTORY': {
            const { historyClearedAt } = item.payload;
            await supabase.from('settings').update({
              history_cleared_at: historyClearedAt,
              updated_at: new Date().toISOString(),
            }).eq('id', 'default');
            break;
          }

          case 'RESET_REPORTS': {
            const { reportsResetAt } = item.payload;
            await supabase.from('settings').update({
              reports_reset_at: reportsResetAt,
              updated_at: new Date().toISOString(),
            }).eq('id', 'default');
            break;
          }

          case 'UPDATE_SETTINGS': {
            const { fifaNormalPrice, fifaExtraTimePrice, currency } = item.payload;
            await supabase.from('settings').update({
              fifa_normal_price: fifaNormalPrice,
              fifa_extra_time_price: fifaExtraTimePrice,
              currency,
              updated_at: new Date().toISOString(),
            }).eq('id', 'default');
            break;
          }

          case 'UPDATE_CONSOLE_NAME': {
            const { consoleId, name } = item.payload;
            await supabase.from('consoles').update({ name }).eq('id', consoleId);
            break;
          }

          case 'TOGGLE_CONSOLE': {
            const { consoleId, isActive } = item.payload;
            await supabase.from('consoles').update({ is_active: isActive }).eq('id', consoleId);
            break;
          }
        }

        if (item.id !== undefined) {
          await removeFromSyncQueue(item.id);
        }
      } catch (err) {
        console.error('Failed to sync queue item:', item, err);
        // Do not throw so other items can attempt sync
      }
    }

    const remaining = await getSyncQueue();
    notifySyncStatus(navigator.onLine, remaining.length);
    notifyDataChanged();
  } finally {
    isSyncing = false;
  }
}

import { getConsolesWithActiveSessionsAction } from '@/app/actions';

// Download cloud state to Local IndexedDB via server actions (tenant-scoped)
export async function downloadCloudToIndexedDB(): Promise<void> {
  if (typeof window === 'undefined' || !navigator.onLine) return;

  try {
    const res = await getConsolesWithActiveSessionsAction();
    if (res.success && res.allConsoles) {
      for (const c of res.allConsoles) {
        await idbPut('consoles', c);
      }
      if (res.settings) {
        await idbPut('settings', res.settings);
      }
      if (res.data) {
        for (const item of res.data) {
          if (item.active_session) {
            await idbPut('sessions', item.active_session);
            if (item.active_session.matches) {
              for (const m of item.active_session.matches) {
                await idbPut('matches', m);
              }
            }
          }
        }
      }
      notifyDataChanged();
    }
  } catch (err) {
    console.warn('downloadCloudToIndexedDB sync warning:', err);
  }
}

// Initialize sync listeners
export function initSyncEngine(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('online', () => {
    notifySyncStatus(true, 0);
    processSyncQueue().then(() => downloadCloudToIndexedDB());
  });

  window.addEventListener('offline', () => {
    getSyncQueue().then((queue) => notifySyncStatus(false, queue.length));
  });

  // Initial check
  if (navigator.onLine) {
    processSyncQueue().then(() => downloadCloudToIndexedDB());
  } else {
    getSyncQueue().then((queue) => notifySyncStatus(false, queue.length));
  }
}

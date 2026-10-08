import { Repository } from '@/lib/repository';
import {
  idbGet,
  idbGetAll,
  idbPut,
  addToSyncQueue,
  initIDBDefaults,
} from '@/lib/db/idb';
import { processSyncQueue, notifyDataChanged } from '@/lib/sync/sync-engine';
import {
  Console,
  Session,
  Match,
  Payment,
  Adjustment,
  Settings,
  User,
  AnalyticsSummary,
} from '@/types';
import { cryptoRandomUUID } from '@/lib/utils';

export const offlineRepository: Repository = {
  async getSettings(): Promise<Settings> {
    await initIDBDefaults();
    const settings = await idbGet<Settings>('settings', 'default');
    return settings || {
      id: 'default',
      fifa_normal_price: 15.00,
      fifa_extra_time_price: 5.00,
      currency: 'ETB',
      updated_at: new Date().toISOString(),
    };
  },

  async updateSettings(fifaNormalPrice: number, fifaExtraTimePrice: number, currency: string): Promise<Settings> {
    const current = await this.getSettings();
    const updated: Settings = {
      ...current,
      fifa_normal_price: fifaNormalPrice,
      fifa_extra_time_price: fifaExtraTimePrice,
      currency,
      updated_at: new Date().toISOString(),
    };

    await idbPut('settings', updated);
    await addToSyncQueue({
      action: 'UPDATE_SETTINGS',
      payload: { fifaNormalPrice, fifaExtraTimePrice, currency },
      timestamp: new Date().toISOString(),
    });

    notifyDataChanged();
    processSyncQueue();
    return updated;
  },

  async getConsoles(): Promise<Console[]> {
    await initIDBDefaults();
    const consoles = await idbGetAll<Console>('consoles');
    return consoles.sort((a, b) => a.display_order - b.display_order);
  },

  async addConsole(): Promise<Console> {
    const consoles = await this.getConsoles();
    let maxNum = 0;
    for (const c of consoles) {
      const m = c.name.match(/TV\s*(\d+)/i);
      if (m) {
        const num = parseInt(m[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    const nextNum = maxNum + 1;
    const newConsole: Console = {
      id: `c-${nextNum}`,
      name: `TV ${nextNum}`,
      status: 'AVAILABLE',
      display_order: consoles.length + 1,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    await idbPut('consoles', newConsole);
    notifyDataChanged();
    return newConsole;
  },

  async updateConsoleName(id: string, name: string): Promise<Console> {
    const c = await idbGet<Console>('consoles', id);
    if (!c) throw new Error('Console TV not found');
    c.name = name;
    await idbPut('consoles', c);

    await addToSyncQueue({
      action: 'UPDATE_CONSOLE_NAME',
      payload: { consoleId: id, name },
      timestamp: new Date().toISOString(),
    });

    notifyDataChanged();
    processSyncQueue();
    return c;
  },

  async toggleConsoleActive(id: string, isActive: boolean): Promise<Console> {
    const c = await idbGet<Console>('consoles', id);
    if (!c) throw new Error('Console TV not found');
    c.is_active = isActive;
    await idbPut('consoles', c);

    await addToSyncQueue({
      action: 'TOGGLE_CONSOLE',
      payload: { consoleId: id, isActive },
      timestamp: new Date().toISOString(),
    });

    notifyDataChanged();
    processSyncQueue();
    return c;
  },

  async getActiveSessionByConsoleId(consoleId: string): Promise<Session | null> {
    const sessions = await idbGetAll<Session>('sessions');
    const active = sessions.find((s) => s.console_id === consoleId && s.status === 'ACTIVE');
    if (!active) return null;
    return this.getSessionById(active.id);
  },

  async getSessionById(sessionId: string): Promise<Session | null> {
    const session = await idbGet<Session>('sessions', sessionId);
    if (!session) return null;

    const consoleObj = await idbGet<Console>('consoles', session.console_id);
    const allMatches = await idbGetAll<Match>('matches');
    const allPayments = await idbGetAll<Payment>('payments');
    const allAdjustments = await idbGetAll<Adjustment>('adjustments');

    const sessionMatches = allMatches
      .filter((m) => m.session_id === sessionId)
      .sort((a, b) => a.match_number - b.match_number);

    const sessionPayments = allPayments.filter((p) => p.session_id === sessionId);
    const sessionAdjustments = allAdjustments
      .filter((a) => a.session_id === sessionId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return {
      ...session,
      console_name: consoleObj?.name || 'TV',
      matches: sessionMatches,
      payments: sessionPayments,
      adjustments: sessionAdjustments,
    };
  },

  async startSession(consoleId: string, createdBy = 'Staff', customSessionId?: string): Promise<Session> {
    const consoleObj = await idbGet<Console>('consoles', consoleId);
    if (!consoleObj) throw new Error('Console TV not found');

    const active = await this.getActiveSessionByConsoleId(consoleId);
    if (active) throw new Error('TV already has an active session');

    const sessionId = customSessionId || cryptoRandomUUID();
    const now = new Date().toISOString();

    const newSession: Session = {
      id: sessionId,
      console_id: consoleId,
      game_type: 'FIFA',
      billing_type: 'MATCH_BASED',
      status: 'ACTIVE',
      started_at: now,
      total_amount: 0.00,
      payment_status: 'UNPAID',
      created_by: createdBy,
      created_at: now,
    };

    consoleObj.status = 'PLAYING';
    await idbPut('consoles', consoleObj);
    await idbPut('sessions', newSession);

    await addToSyncQueue({
      action: 'START_SESSION',
      payload: { consoleId, createdBy, customSessionId: sessionId },
      timestamp: now,
    });

    notifyDataChanged();
    processSyncQueue();

    const created = await this.getSessionById(sessionId);
    if (!created) throw new Error('Failed to retrieve created session');
    return created;
  },

  async addMatch(sessionId: string, idempotencyKey?: string): Promise<{ match: Match; sessionTotal: number }> {
    const session = await idbGet<Session>('sessions', sessionId);
    if (!session || session.status !== 'ACTIVE') {
      throw new Error('Session is not active');
    }

    const allMatches = await idbGetAll<Match>('matches');
    if (idempotencyKey) {
      const existing = allMatches.find(
        (m) => m.session_id === sessionId && m.client_idempotency_key === idempotencyKey
      );
      if (existing) {
        return { match: existing, sessionTotal: session.total_amount };
      }
    }

    const settings = await this.getSettings();
    const sessionMatches = allMatches.filter((m) => m.session_id === sessionId);
    const nextMatchNum = sessionMatches.length > 0
      ? Math.max(...sessionMatches.map((m) => m.match_number)) + 1
      : 1;

    const matchId = cryptoRandomUUID();
    const now = new Date().toISOString();
    const basePrice = settings.fifa_normal_price;

    const newMatch: Match = {
      id: matchId,
      session_id: sessionId,
      match_number: nextMatchNum,
      base_price: basePrice,
      extra_time: false,
      extra_time_price: 0.00,
      total_price: basePrice,
      client_idempotency_key: idempotencyKey,
      created_at: now,
    };

    await idbPut('matches', newMatch);

    const updatedMatches = [...sessionMatches, newMatch];
    const newTotal = updatedMatches.reduce((acc, m) => acc + m.total_price, 0);
    session.total_amount = newTotal;
    await idbPut('sessions', session);

    await addToSyncQueue({
      action: 'ADD_MATCH',
      payload: {
        sessionId,
        matchId,
        matchNumber: nextMatchNum,
        basePrice,
        extraTime: false,
        extraTimePrice: 0.00,
        totalPrice: basePrice,
        idempotencyKey,
      },
      timestamp: now,
    });

    notifyDataChanged();
    processSyncQueue();

    return { match: newMatch, sessionTotal: newTotal };
  },

  async toggleMatchExtraTime(sessionId: string, matchId: string): Promise<{ match: Match; sessionTotal: number }> {
    const session = await idbGet<Session>('sessions', sessionId);
    if (!session || session.status !== 'ACTIVE') throw new Error('Session is not active');

    const match = await idbGet<Match>('matches', matchId);
    if (!match || match.session_id !== sessionId) throw new Error('Match not found');

    const settings = await this.getSettings();
    const isAdding = !match.extra_time;
    const extraPrice = isAdding ? settings.fifa_extra_time_price : 0.00;
    const totalPrice = match.base_price + extraPrice;

    match.extra_time = isAdding;
    match.extra_time_price = extraPrice;
    match.total_price = totalPrice;
    await idbPut('matches', match);

    const allMatches = await idbGetAll<Match>('matches');
    const sessionMatches = allMatches.filter((m) => m.session_id === sessionId);
    const newTotal = sessionMatches.reduce((acc, m) => acc + m.total_price, 0);
    session.total_amount = newTotal;
    await idbPut('sessions', session);

    await addToSyncQueue({
      action: 'TOGGLE_EXTRA_TIME',
      payload: { sessionId, matchId, extraTime: isAdding, extraTimePrice: extraPrice, totalPrice },
      timestamp: new Date().toISOString(),
    });

    notifyDataChanged();
    processSyncQueue();

    return { match, sessionTotal: newTotal };
  },

  async undoLastMatch(sessionId: string): Promise<{ sessionTotal: number }> {
    const session = await idbGet<Session>('sessions', sessionId);
    if (!session || session.status !== 'ACTIVE') throw new Error('Session is not active');

    const allMatches = await idbGetAll<Match>('matches');
    const sessionMatches = allMatches
      .filter((m) => m.session_id === sessionId)
      .sort((a, b) => b.match_number - a.match_number);

    if (sessionMatches.length === 0) {
      return { sessionTotal: 0 };
    }

    const lastMatch = sessionMatches[0];
    const indexedDB = await import('@/lib/db/idb');
    await indexedDB.idbDelete('matches', lastMatch.id);

    const remainingMatches = sessionMatches.filter((m) => m.id !== lastMatch.id);
    const newTotal = remainingMatches.reduce((acc, m) => acc + m.total_price, 0);
    session.total_amount = newTotal;
    await idbPut('sessions', session);

    await addToSyncQueue({
      action: 'UNDO_MATCH',
      payload: { sessionId, matchId: lastMatch.id },
      timestamp: new Date().toISOString(),
    });

    notifyDataChanged();
    processSyncQueue();

    return { sessionTotal: newTotal };
  },

  async finishSession(sessionId: string, paymentMethod: 'CASH' | 'TELEBIRR' | 'CBE', reference?: string): Promise<Session> {
    const session = await idbGet<Session>('sessions', sessionId);
    if (!session) throw new Error('Session not found');
    if (session.status !== 'ACTIVE') throw new Error('Session is already finished');

    const now = new Date().toISOString();
    const finalTotal = session.total_amount;
    const paymentId = cryptoRandomUUID();

    const payment: Payment = {
      id: paymentId,
      session_id: sessionId,
      method: paymentMethod,
      amount: finalTotal,
      reference: reference || undefined,
      created_at: now,
    };

    session.status = 'FINISHED';
    session.payment_status = 'PAID';
    session.finished_at = now;
    session.total_amount = finalTotal;

    const consoleObj = await idbGet<Console>('consoles', session.console_id);
    if (consoleObj) {
      consoleObj.status = 'AVAILABLE';
      await idbPut('consoles', consoleObj);
    }

    await idbPut('payments', payment);
    await idbPut('sessions', session);

    await addToSyncQueue({
      action: 'FINISH_SESSION',
      payload: {
        sessionId,
        paymentMethod,
        reference,
        totalAmount: finalTotal,
        finishedAt: now,
        consoleId: session.console_id,
      },
      timestamp: now,
    });

    notifyDataChanged();
    processSyncQueue();

    const finished = await this.getSessionById(sessionId);
    if (!finished) throw new Error('Failed to retrieve finished session');
    return finished;
  },

  async createAdjustment(sessionId: string, adjustmentAmount: number, reason: string, createdBy = 'Manager'): Promise<Adjustment> {
    const session = await idbGet<Session>('sessions', sessionId);
    if (!session) throw new Error('Session not found');

    const id = cryptoRandomUUID();
    const now = new Date().toISOString();
    const originalAmount = session.total_amount;
    const resultingAmount = originalAmount + adjustmentAmount;

    const adjustment: Adjustment = {
      id,
      session_id: sessionId,
      original_amount: originalAmount,
      adjustment_amount: adjustmentAmount,
      resulting_amount: resultingAmount,
      reason,
      created_by: createdBy,
      created_at: now,
    };

    await idbPut('adjustments', adjustment);
    session.total_amount = resultingAmount;
    await idbPut('sessions', session);

    notifyDataChanged();
    return adjustment;
  },

  async getSessionsHistory(limit = 100): Promise<Session[]> {
    const settings = await this.getSettings();
    const clearedAt = settings.history_cleared_at ? new Date(settings.history_cleared_at).getTime() : 0;

    const allSessions = await idbGetAll<Session>('sessions');
    const finished = allSessions
      .filter((s) => s.status === 'FINISHED')
      .filter((s) => new Date(s.finished_at || s.created_at).getTime() > clearedAt)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);

    const result: Session[] = [];
    for (const item of finished) {
      const sess = await this.getSessionById(item.id);
      if (sess) result.push(sess);
    }
    return result;
  },

  async clearCompletedHistory(): Promise<{ deletedCount: number }> {
    const now = new Date().toISOString();
    const settings = await this.getSettings();
    settings.history_cleared_at = now;
    settings.updated_at = now;
    await idbPut('settings', settings);

    await addToSyncQueue({
      action: 'CLEAR_HISTORY',
      payload: { historyClearedAt: now },
      timestamp: now,
    });

    notifyDataChanged();
    processSyncQueue();
    return { deletedCount: 1 };
  },

  async clearTodayHistory(): Promise<{ deletedCount: number }> {
    return this.clearCompletedHistory();
  },

  async resetReports(): Promise<{ deletedCount: number }> {
    const now = new Date().toISOString();
    const settings = await this.getSettings();
    settings.reports_reset_at = now;
    settings.updated_at = now;
    await idbPut('settings', settings);

    await addToSyncQueue({
      action: 'RESET_REPORTS',
      payload: { reportsResetAt: now },
      timestamp: now,
    });

    notifyDataChanged();
    processSyncQueue();
    return { deletedCount: 1 };
  },

  async getAnalyticsSummary(): Promise<AnalyticsSummary> {
    const settings = await this.getSettings();
    const resetAt = settings.reports_reset_at ? new Date(settings.reports_reset_at).getTime() : 0;

    const allSessions = await idbGetAll<Session>('sessions');
    const finishedSessions: Session[] = [];
    for (const s of allSessions) {
      if (s.status === 'FINISHED' && new Date(s.finished_at || s.created_at).getTime() > resetAt) {
        const full = await this.getSessionById(s.id);
        if (full) finishedSessions.push(full);
      }
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const isToday = (dateStr: string) => dateStr.startsWith(todayStr);
    const isThisWeek = (dateStr: string) => {
      const d = new Date(dateStr);
      const diff = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
      return diff <= 7;
    };
    const isThisMonth = (dateStr: string) => {
      const d = new Date(dateStr);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    };

    let todayRev = 0;
    let weekRev = 0;
    let monthRev = 0;
    let allTimeRev = 0;

    let todaySessions = 0;
    let todayMatches = 0;
    let todayExtraTimes = 0;

    const revByMethod = { CASH: 0, TELEBIRR: 0, CBE: 0 };
    const revByConsole: Record<string, number> = {};

    const dbConsoles = await this.getConsoles();
    for (const c of dbConsoles) {
      revByConsole[c.name] = 0;
    }

    for (const sess of finishedSessions) {
      const amt = sess.total_amount;
      const date = sess.finished_at || sess.created_at;

      allTimeRev += amt;
      if (isThisMonth(date)) monthRev += amt;
      if (isThisWeek(date)) weekRev += amt;

      if (isToday(date)) {
        todayRev += amt;
        todaySessions++;
        const matchCount = sess.matches?.length || 0;
        const extraCount = sess.matches?.filter((m) => m.extra_time).length || 0;
        todayMatches += matchCount;
        todayExtraTimes += extraCount;
      }

      const consoleName = sess.console_name || 'TV';
      revByConsole[consoleName] = (revByConsole[consoleName] || 0) + amt;

      if (sess.payments) {
        for (const p of sess.payments) {
          if (p.method in revByMethod) {
            revByMethod[p.method] += p.amount;
          }
        }
      }
    }

    return {
      revenue: {
        today: todayRev,
        week: weekRev,
        month: monthRev,
        allTime: allTimeRev,
      },
      counts: {
        todaySessions,
        todayMatches,
        todayExtraTimes,
      },
      revenueByPaymentMethod: revByMethod,
      revenueByConsole: revByConsole,
    };
  },

  async getUsers(): Promise<User[]> {
    const users = await idbGetAll<User>('users');
    return users;
  },

  async getUserByUsername(username: string): Promise<User | null> {
    const users = await this.getUsers();
    return users.find((u) => u.username === username) || null;
  },
};

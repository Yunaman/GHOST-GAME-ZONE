import { isSupabaseConfigured, supabase } from '@/lib/db/supabase';
import { loadDb, saveDb } from '@/lib/db/fs-db';
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

export interface Repository {
  getSettings(tenantId?: string): Promise<Settings>;
  updateSettings(
    fifa_normal_price: number,
    fifa_extra_time_price: number,
    currency: string,
    tenantId?: string
  ): Promise<Settings>;
  getConsoles(tenantId?: string): Promise<Console[]>;
  addConsole(tenantId?: string): Promise<Console>;
  updateConsoleName(id: string, name: string, tenantId?: string): Promise<Console>;
  toggleConsoleActive(id: string, isActive: boolean, tenantId?: string): Promise<Console>;
  getActiveSessionByConsoleId(consoleId: string, tenantId?: string): Promise<Session | null>;
  getSessionById(sessionId: string, tenantId?: string): Promise<Session | null>;
  startSession(
    consoleId: string,
    createdBy?: string,
    customSessionId?: string,
    tenantId?: string
  ): Promise<Session>;
  addMatch(
    sessionId: string,
    idempotencyKey?: string,
    tenantId?: string
  ): Promise<{ match: Match; sessionTotal: number }>;
  toggleMatchExtraTime(
    sessionId: string,
    matchId: string,
    tenantId?: string
  ): Promise<{ match: Match; sessionTotal: number }>;
  undoLastMatch(sessionId: string, tenantId?: string): Promise<{ sessionTotal: number }>;
  finishSession(
    sessionId: string,
    paymentMethod: 'CASH' | 'TELEBIRR' | 'CBE',
    reference?: string,
    tenantId?: string
  ): Promise<Session>;
  createAdjustment(
    sessionId: string,
    adjustmentAmount: number,
    reason: string,
    createdBy?: string,
    tenantId?: string
  ): Promise<Adjustment>;
  getSessionsHistory(limit?: number, tenantId?: string): Promise<Session[]>;
  clearCompletedHistory(tenantId?: string): Promise<{ deletedCount: number }>;
  clearTodayHistory(tenantId?: string): Promise<{ deletedCount: number }>;
  resetReports(tenantId?: string): Promise<{ deletedCount: number }>;
  getAnalyticsSummary(tenantId?: string): Promise<AnalyticsSummary>;
  getUsers(tenantId?: string): Promise<User[]>;
  getUserByUsername(username: string): Promise<User | null>;
}

function resolveTenantId(providedTenantId?: string): string {
  return providedTenantId || 't-original';
}

function syncFsSessionTotal(sessionId: string): number {
  const db = loadDb();
  const sessionMatches = db.matches.filter((m) => m.session_id === sessionId);
  const sessionAdjustments = db.adjustments.filter((a) => a.session_id === sessionId);

  const matchesSum = sessionMatches.reduce((acc, m) => acc + m.total_price, 0);
  const adjustmentsSum = sessionAdjustments.reduce((acc, a) => acc + a.adjustment_amount, 0);
  const total = matchesSum + adjustmentsSum;

  const session = db.sessions.find((s) => s.id === sessionId);
  if (session) {
    session.total_amount = total;
    saveDb(db);
  }
  return total;
}

function getNextTvNumber(consoles: Console[]): number {
  let maxNum = 0;
  for (const c of consoles) {
    const match = c.name.match(/TV\s*(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  return maxNum + 1;
}

// --- Local FileSystem Persistence Repository ---
const fsRepository: Repository = {
  async getSettings(providedTenantId?: string): Promise<Settings> {
    const tenantId = resolveTenantId(providedTenantId);
    const db = loadDb();
    const settingsArr = Array.isArray(db.settings) ? db.settings : [db.settings];
    const found = settingsArr.find((s) => s.tenant_id === tenantId || s.id === `s-${tenantId}`);
    return (
      found || {
        id: `s-${tenantId}`,
        tenant_id: tenantId,
        fifa_normal_price: 15.00,
        fifa_extra_time_price: 5.00,
        currency: 'ETB',
        updated_at: new Date().toISOString(),
      }
    );
  },

  async updateSettings(
    fifa_normal_price: number,
    fifa_extra_time_price: number,
    currency: string,
    providedTenantId?: string
  ): Promise<Settings> {
    const tenantId = resolveTenantId(providedTenantId);
    const db = loadDb();
    const now = new Date().toISOString();
    const current = await this.getSettings(tenantId);

    const updated: Settings = {
      id: `s-${tenantId}`,
      tenant_id: tenantId,
      fifa_normal_price,
      fifa_extra_time_price,
      currency,
      history_cleared_at: current.history_cleared_at,
      reports_reset_at: current.reports_reset_at,
      updated_at: now,
    };

    if (Array.isArray(db.settings)) {
      const idx = db.settings.findIndex((s) => s.tenant_id === tenantId || s.id === `s-${tenantId}`);
      if (idx >= 0) db.settings[idx] = updated;
      else db.settings.push(updated);
    } else {
      db.settings = [updated] as any;
    }

    saveDb(db);
    return updated;
  },

  async getConsoles(providedTenantId?: string): Promise<Console[]> {
    const tenantId = resolveTenantId(providedTenantId);
    const db = loadDb();
    return db.consoles
      .filter((c) => c.tenant_id === tenantId || (!c.tenant_id && tenantId === 't-original'))
      .sort((a, b) => a.display_order - b.display_order);
  },

  async addConsole(providedTenantId?: string): Promise<Console> {
    const tenantId = resolveTenantId(providedTenantId);
    const db = loadDb();
    const tenantConsoles = await this.getConsoles(tenantId);
    const nextNum = getNextTvNumber(tenantConsoles);
    const newName = `TV ${nextNum}`;
    const newId = `c-${tenantId}-${nextNum}`;
    const now = new Date().toISOString();

    const newConsole: Console = {
      id: newId,
      tenant_id: tenantId,
      name: newName,
      status: 'AVAILABLE',
      display_order: tenantConsoles.length + 1,
      is_active: true,
      created_at: now,
    };

    db.consoles.push(newConsole);
    saveDb(db);
    return newConsole;
  },

  async updateConsoleName(id: string, name: string, providedTenantId?: string): Promise<Console> {
    const tenantId = resolveTenantId(providedTenantId);
    const db = loadDb();
    const consoleObj = db.consoles.find(
      (c) => c.id === id && (c.tenant_id === tenantId || (!c.tenant_id && tenantId === 't-original'))
    );
    if (!consoleObj) throw new Error('Console TV not found for this tenant');
    consoleObj.name = name;
    saveDb(db);
    return consoleObj;
  },

  async toggleConsoleActive(id: string, isActive: boolean, providedTenantId?: string): Promise<Console> {
    const tenantId = resolveTenantId(providedTenantId);
    const db = loadDb();
    const consoleObj = db.consoles.find(
      (c) => c.id === id && (c.tenant_id === tenantId || (!c.tenant_id && tenantId === 't-original'))
    );
    if (!consoleObj) throw new Error('Console TV not found for this tenant');
    consoleObj.is_active = isActive;
    saveDb(db);
    return consoleObj;
  },

  async getActiveSessionByConsoleId(consoleId: string, providedTenantId?: string): Promise<Session | null> {
    const tenantId = resolveTenantId(providedTenantId);
    const db = loadDb();
    const active = db.sessions.find(
      (s) =>
        s.console_id === consoleId &&
        s.status === 'ACTIVE' &&
        (s.tenant_id === tenantId || (!s.tenant_id && tenantId === 't-original'))
    );
    if (!active) return null;
    return this.getSessionById(active.id, tenantId);
  },

  async getSessionById(sessionId: string, providedTenantId?: string): Promise<Session | null> {
    const tenantId = resolveTenantId(providedTenantId);
    const db = loadDb();
    const session = db.sessions.find(
      (s) =>
        s.id === sessionId &&
        (s.tenant_id === tenantId || (!s.tenant_id && tenantId === 't-original'))
    );
    if (!session) return null;

    const consoleObj = db.consoles.find((c) => c.id === session.console_id);
    const matches = db.matches
      .filter((m) => m.session_id === sessionId)
      .sort((a, b) => a.match_number - b.match_number);
    const payments = db.payments.filter((p) => p.session_id === sessionId);
    const adjustments = db.adjustments
      .filter((a) => a.session_id === sessionId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return {
      ...session,
      console_name: consoleObj?.name || 'TV',
      matches,
      payments,
      adjustments,
    };
  },

  async startSession(
    consoleId: string,
    createdBy = 'Staff',
    customSessionId?: string,
    providedTenantId?: string
  ): Promise<Session> {
    const tenantId = resolveTenantId(providedTenantId);
    const db = loadDb();
    const consoleObj = db.consoles.find(
      (c) => c.id === consoleId && (c.tenant_id === tenantId || (!c.tenant_id && tenantId === 't-original'))
    );
    if (!consoleObj) throw new Error('Console TV not found for this tenant');

    const active = db.sessions.find(
      (s) =>
        s.console_id === consoleId &&
        s.status === 'ACTIVE' &&
        (s.tenant_id === tenantId || (!s.tenant_id && tenantId === 't-original'))
    );
    if (active) throw new Error('TV already has an active session');

    const sessionId = customSessionId || cryptoRandomUUID();
    const now = new Date().toISOString();

    const newSession: Session = {
      id: sessionId,
      tenant_id: tenantId,
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

    db.sessions.push(newSession);
    consoleObj.status = 'PLAYING';
    saveDb(db);

    const created = await this.getSessionById(sessionId, tenantId);
    if (!created) throw new Error('Failed to retrieve created session');
    return created;
  },

  async addMatch(
    sessionId: string,
    idempotencyKey?: string,
    providedTenantId?: string
  ): Promise<{ match: Match; sessionTotal: number }> {
    const tenantId = resolveTenantId(providedTenantId);
    const db = loadDb();
    const session = db.sessions.find((s) => s.id === sessionId);
    if (!session || session.status !== 'ACTIVE') {
      throw new Error('Session is not active');
    }

    if (idempotencyKey) {
      const existing = db.matches.find(
        (m) => m.session_id === sessionId && m.client_idempotency_key === idempotencyKey
      );
      if (existing) {
        const currentTotal = syncFsSessionTotal(sessionId);
        return { match: existing, sessionTotal: currentTotal };
      }
    }

    const settings = await this.getSettings(tenantId);
    const sessionMatches = db.matches.filter((m) => m.session_id === sessionId);
    const nextMatchNum = sessionMatches.length > 0
      ? Math.max(...sessionMatches.map((m) => m.match_number)) + 1
      : 1;

    const matchId = cryptoRandomUUID();
    const now = new Date().toISOString();
    const basePrice = settings.fifa_normal_price ?? 15.00;

    const newMatch: Match = {
      id: matchId,
      tenant_id: tenantId,
      session_id: sessionId,
      match_number: nextMatchNum,
      base_price: basePrice,
      extra_time: false,
      extra_time_price: 0.00,
      total_price: basePrice,
      client_idempotency_key: idempotencyKey,
      created_at: now,
    };

    db.matches.push(newMatch);
    saveDb(db);

    const sessionTotal = syncFsSessionTotal(sessionId);
    return { match: newMatch, sessionTotal };
  },

  async toggleMatchExtraTime(
    sessionId: string,
    matchId: string,
    providedTenantId?: string
  ): Promise<{ match: Match; sessionTotal: number }> {
    const tenantId = resolveTenantId(providedTenantId);
    const db = loadDb();
    const session = db.sessions.find((s) => s.id === sessionId);
    if (!session || session.status !== 'ACTIVE') {
      throw new Error('Session is not active');
    }

    const match = db.matches.find((m) => m.id === matchId && m.session_id === sessionId);
    if (!match) throw new Error('Match not found');

    const settings = await this.getSettings(tenantId);
    const extraPrice = settings.fifa_extra_time_price ?? 5.00;

    if (match.extra_time) {
      match.extra_time = false;
      match.extra_time_price = 0.00;
      match.total_price = match.base_price;
    } else {
      match.extra_time = true;
      match.extra_time_price = extraPrice;
      match.total_price = match.base_price + extraPrice;
    }

    saveDb(db);
    const sessionTotal = syncFsSessionTotal(sessionId);
    return { match, sessionTotal };
  },

  async undoLastMatch(sessionId: string, providedTenantId?: string): Promise<{ sessionTotal: number }> {
    const db = loadDb();
    const session = db.sessions.find((s) => s.id === sessionId);
    if (!session || session.status !== 'ACTIVE') {
      throw new Error('Session is not active');
    }

    const sessionMatches = db.matches
      .filter((m) => m.session_id === sessionId)
      .sort((a, b) => b.match_number - a.match_number);

    if (sessionMatches.length === 0) {
      return { sessionTotal: 0 };
    }

    const lastMatch = sessionMatches[0];
    db.matches = db.matches.filter((m) => m.id !== lastMatch.id);
    saveDb(db);

    const sessionTotal = syncFsSessionTotal(sessionId);
    return { sessionTotal };
  },

  async finishSession(
    sessionId: string,
    paymentMethod: 'CASH' | 'TELEBIRR' | 'CBE',
    reference?: string,
    providedTenantId?: string
  ): Promise<Session> {
    const tenantId = resolveTenantId(providedTenantId);
    const db = loadDb();
    const session = db.sessions.find((s) => s.id === sessionId);
    if (!session) throw new Error('Session not found');
    if (session.status !== 'ACTIVE') throw new Error('Session is already finished');

    const finalTotal = syncFsSessionTotal(sessionId);
    const now = new Date().toISOString();
    const paymentId = cryptoRandomUUID();

    const newPayment: Payment = {
      id: paymentId,
      tenant_id: tenantId,
      session_id: sessionId,
      method: paymentMethod,
      amount: finalTotal,
      reference: reference || undefined,
      created_at: now,
    };

    db.payments.push(newPayment);

    session.status = 'FINISHED';
    session.payment_status = 'PAID';
    session.finished_at = now;
    session.total_amount = finalTotal;

    const consoleObj = db.consoles.find((c) => c.id === session.console_id);
    if (consoleObj) {
      consoleObj.status = 'AVAILABLE';
    }

    saveDb(db);

    const finished = await this.getSessionById(sessionId, tenantId);
    if (!finished) throw new Error('Failed to fetch finished session');
    return finished;
  },

  async createAdjustment(
    sessionId: string,
    adjustmentAmount: number,
    reason: string,
    createdBy = 'Manager',
    providedTenantId?: string
  ): Promise<Adjustment> {
    const tenantId = resolveTenantId(providedTenantId);
    const db = loadDb();
    const session = db.sessions.find((s) => s.id === sessionId);
    if (!session) throw new Error('Session not found');

    const id = cryptoRandomUUID();
    const now = new Date().toISOString();
    const originalAmount = session.total_amount;
    const resultingAmount = originalAmount + adjustmentAmount;

    const newAdjustment: Adjustment = {
      id,
      tenant_id: tenantId,
      session_id: sessionId,
      original_amount: originalAmount,
      adjustment_amount: adjustmentAmount,
      resulting_amount: resultingAmount,
      reason,
      created_by: createdBy,
      created_at: now,
    };

    db.adjustments.push(newAdjustment);
    saveDb(db);

    syncFsSessionTotal(sessionId);

    if (session.status === 'FINISHED') {
      const payment = db.payments.find((p) => p.session_id === sessionId);
      if (payment) {
        payment.amount = resultingAmount;
        saveDb(db);
      }
    }

    return newAdjustment;
  },

  async getSessionsHistory(limit = 100, providedTenantId?: string): Promise<Session[]> {
    const tenantId = resolveTenantId(providedTenantId);
    const db = loadDb();
    const settings = await this.getSettings(tenantId);
    const clearedAt = settings.history_cleared_at ? new Date(settings.history_cleared_at).getTime() : 0;

    const sorted = db.sessions
      .filter(
        (s) =>
          s.status === 'FINISHED' &&
          (s.tenant_id === tenantId || (!s.tenant_id && tenantId === 't-original'))
      )
      .filter((s) => new Date(s.finished_at || s.created_at).getTime() > clearedAt)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);

    const result: Session[] = [];
    for (const item of sorted) {
      const sess = await this.getSessionById(item.id, tenantId);
      if (sess) result.push(sess);
    }
    return result;
  },

  async clearCompletedHistory(providedTenantId?: string): Promise<{ deletedCount: number }> {
    const tenantId = resolveTenantId(providedTenantId);
    const db = loadDb();
    const now = new Date().toISOString();
    const previousHistory = await this.getSessionsHistory(1000, tenantId);

    const settings = await this.getSettings(tenantId);
    settings.history_cleared_at = now;
    settings.updated_at = now;

    if (Array.isArray(db.settings)) {
      const idx = db.settings.findIndex((s) => s.tenant_id === tenantId || s.id === `s-${tenantId}`);
      if (idx >= 0) db.settings[idx] = settings;
      else db.settings.push(settings);
    } else {
      db.settings = [settings] as any;
    }

    saveDb(db);
    return { deletedCount: previousHistory.length };
  },

  async clearTodayHistory(providedTenantId?: string): Promise<{ deletedCount: number }> {
    return this.clearCompletedHistory(providedTenantId);
  },

  async resetReports(providedTenantId?: string): Promise<{ deletedCount: number }> {
    const tenantId = resolveTenantId(providedTenantId);
    const db = loadDb();
    const now = new Date().toISOString();
    const settings = await this.getSettings(tenantId);
    settings.reports_reset_at = now;
    settings.updated_at = now;

    if (Array.isArray(db.settings)) {
      const idx = db.settings.findIndex((s) => s.tenant_id === tenantId || s.id === `s-${tenantId}`);
      if (idx >= 0) db.settings[idx] = settings;
      else db.settings.push(settings);
    } else {
      db.settings = [settings] as any;
    }

    saveDb(db);
    return { deletedCount: 1 };
  },

  async getAnalyticsSummary(providedTenantId?: string): Promise<AnalyticsSummary> {
    const tenantId = resolveTenantId(providedTenantId);
    const db = loadDb();
    const settings = await this.getSettings(tenantId);
    const resetAt = settings.reports_reset_at ? new Date(settings.reports_reset_at).getTime() : 0;

    const allFinishedSessions = db.sessions.filter(
      (s) =>
        s.status === 'FINISHED' &&
        (s.tenant_id === tenantId || (!s.tenant_id && tenantId === 't-original'))
    );

    const finishedSessions: Session[] = [];
    for (const item of allFinishedSessions) {
      if (new Date(item.finished_at || item.created_at).getTime() > resetAt) {
        const full = await this.getSessionById(item.id, tenantId);
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

    const dbConsoles = await this.getConsoles(tenantId);
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

  async getUsers(providedTenantId?: string): Promise<User[]> {
    const tenantId = resolveTenantId(providedTenantId);
    const db = loadDb();
    return db.users.filter(
      (u) => u.tenant_id === tenantId || (!u.tenant_id && tenantId === 't-original')
    );
  },

  async getUserByUsername(username: string): Promise<User | null> {
    const db = loadDb();
    const user = db.users.find((u) => u.username === username);
    return user || null;
  },
};

function getSupabaseClient() {
  if (!supabase) {
    throw new Error('Supabase client is not configured.');
  }
  return supabase;
}

// --- Supabase Repository ---
const supabaseRepository: Repository = {
  async getSettings(providedTenantId?: string): Promise<Settings> {
    const tenantId = resolveTenantId(providedTenantId);
    const client = getSupabaseClient();
    const { data } = await client
      .from('settings')
      .select('*')
      .or(`tenant_id.eq.${tenantId},id.eq.s-${tenantId}`)
      .limit(1);

    const settingsData = data && data.length > 0 ? data[0] : null;

    return {
      id: settingsData?.id || `s-${tenantId}`,
      tenant_id: tenantId,
      fifa_normal_price: Number(settingsData?.fifa_normal_price || 15.00),
      fifa_extra_time_price: Number(settingsData?.fifa_extra_time_price || 5.00),
      currency: settingsData?.currency || 'ETB',
      history_cleared_at: settingsData?.history_cleared_at || undefined,
      reports_reset_at: settingsData?.reports_reset_at || undefined,
      updated_at: settingsData?.updated_at || new Date().toISOString(),
    };
  },

  async updateSettings(
    fifa_normal_price: number,
    fifa_extra_time_price: number,
    currency: string,
    providedTenantId?: string
  ): Promise<Settings> {
    const tenantId = resolveTenantId(providedTenantId);
    const client = getSupabaseClient();
    const now = new Date().toISOString();

    const { data, error } = await client
      .from('settings')
      .upsert({
        id: `s-${tenantId}`,
        tenant_id: tenantId,
        fifa_normal_price,
        fifa_extra_time_price,
        currency,
        updated_at: now,
      })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message || 'Failed to update settings');
    return {
      id: data.id,
      tenant_id: tenantId,
      fifa_normal_price: Number(data.fifa_normal_price),
      fifa_extra_time_price: Number(data.fifa_extra_time_price),
      currency: data.currency,
      updated_at: data.updated_at,
    };
  },

  async getConsoles(providedTenantId?: string): Promise<Console[]> {
    const tenantId = resolveTenantId(providedTenantId);
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('consoles')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('display_order', { ascending: true });

    if (error || !data) return [];
    return data as Console[];
  },

  async addConsole(providedTenantId?: string): Promise<Console> {
    const tenantId = resolveTenantId(providedTenantId);
    const client = getSupabaseClient();
    const consoles = await this.getConsoles(tenantId);
    const nextNum = getNextTvNumber(consoles);
    const name = `TV ${nextNum}`;

    const { data, error } = await client
      .from('consoles')
      .insert({
        id: `c-${tenantId}-${nextNum}`,
        tenant_id: tenantId,
        name,
        status: 'AVAILABLE',
        display_order: consoles.length + 1,
        is_active: true,
      })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message || 'Failed to add TV station');
    return data as Console;
  },

  async updateConsoleName(id: string, name: string, providedTenantId?: string): Promise<Console> {
    const tenantId = resolveTenantId(providedTenantId);
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('consoles')
      .update({ name })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error || !data) throw new Error(error?.message || 'Failed to update TV name');
    return data as Console;
  },

  async toggleConsoleActive(id: string, isActive: boolean, providedTenantId?: string): Promise<Console> {
    const tenantId = resolveTenantId(providedTenantId);
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('consoles')
      .update({ is_active: isActive })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error || !data) throw new Error(error?.message || 'Failed to toggle TV status');
    return data as Console;
  },

  async getActiveSessionByConsoleId(consoleId: string, providedTenantId?: string): Promise<Session | null> {
    const tenantId = resolveTenantId(providedTenantId);
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('sessions')
      .select('id')
      .eq('console_id', consoleId)
      .eq('tenant_id', tenantId)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) return null;
    return this.getSessionById(data[0].id, tenantId);
  },

  async getSessionById(sessionId: string, providedTenantId?: string): Promise<Session | null> {
    const tenantId = resolveTenantId(providedTenantId);
    const client = getSupabaseClient();
    const { data: session, error } = await client
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !session) return null;

    const { data: consoleObj } = await client
      .from('consoles')
      .select('name')
      .eq('id', session.console_id)
      .single();

    const { data: matches } = await client
      .from('matches')
      .select('*')
      .eq('session_id', sessionId)
      .order('match_number', { ascending: true });

    const { data: payments } = await client.from('payments').select('*').eq('session_id', sessionId);
    const { data: adjustments } = await client
      .from('adjustments')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    return {
      ...session,
      total_amount: Number(session.total_amount),
      console_name: consoleObj?.name || 'TV',
      matches: (matches || []).map((m) => ({
        ...m,
        base_price: Number(m.base_price),
        extra_time_price: Number(m.extra_time_price),
        total_price: Number(m.total_price),
      })),
      payments: (payments || []).map((p) => ({ ...p, amount: Number(p.amount) })),
      adjustments: (adjustments || []).map((a) => ({
        ...a,
        original_amount: Number(a.original_amount),
        adjustment_amount: Number(a.adjustment_amount),
        resulting_amount: Number(a.resulting_amount),
      })),
    };
  },

  async startSession(
    consoleId: string,
    createdBy = 'Staff',
    customSessionId?: string,
    providedTenantId?: string
  ): Promise<Session> {
    const tenantId = resolveTenantId(providedTenantId);
    const client = getSupabaseClient();

    // Check existing active session scoped by tenant_id and console_id
    const { data: existing } = await client
      .from('sessions')
      .select('id')
      .eq('console_id', consoleId)
      .eq('tenant_id', tenantId)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .limit(1);

    if (existing && existing.length > 0) {
      throw new Error('TV already has an active session');
    }

    const insertPayload: any = {
      tenant_id: tenantId,
      console_id: consoleId,
      game_type: 'FIFA',
      billing_type: 'MATCH_BASED',
      status: 'ACTIVE',
      total_amount: 0.00,
      payment_status: 'UNPAID',
      created_by: createdBy,
    };
    if (customSessionId) {
      insertPayload.id = customSessionId;
    }

    const { data: session, error } = await client
      .from('sessions')
      .insert(insertPayload)
      .select()
      .single();

    if (error || !session) throw new Error(error?.message || 'Failed to start session');

    await client
      .from('consoles')
      .update({ status: 'PLAYING' })
      .eq('id', consoleId)
      .eq('tenant_id', tenantId);

    const fullSession = await this.getSessionById(session.id, tenantId);
    if (!fullSession) throw new Error('Session retrieval failed');
    return fullSession;
  },

  async addMatch(
    sessionId: string,
    idempotencyKey?: string,
    providedTenantId?: string
  ): Promise<{ match: Match; sessionTotal: number }> {
    const tenantId = resolveTenantId(providedTenantId);
    const client = getSupabaseClient();

    const session = await this.getSessionById(sessionId, tenantId);
    if (!session || session.status !== 'ACTIVE') throw new Error('Session is not active');

    if (idempotencyKey) {
      const { data: existing } = await client
        .from('matches')
        .select('*')
        .eq('session_id', sessionId)
        .eq('client_idempotency_key', idempotencyKey)
        .single();
      if (existing) {
        return { match: existing as Match, sessionTotal: session.total_amount };
      }
    }

    const settings = await this.getSettings(tenantId);
    const nextMatchNum = (session.matches?.length || 0) + 1;
    const basePrice = settings.fifa_normal_price;

    const { data: createdMatch, error } = await client
      .from('matches')
      .insert({
        tenant_id: tenantId,
        session_id: sessionId,
        match_number: nextMatchNum,
        base_price: basePrice,
        extra_time: false,
        extra_time_price: 0.00,
        total_price: basePrice,
        client_idempotency_key: idempotencyKey || null,
      })
      .select()
      .single();

    if (error || !createdMatch) throw new Error(error?.message || 'Failed to create match');

    const updatedMatches = [...(session.matches || []), createdMatch];
    const newTotal = updatedMatches.reduce((acc, m) => acc + Number(m.total_price), 0);
    await client.from('sessions').update({ total_amount: newTotal }).eq('id', sessionId);

    return {
      match: {
        ...createdMatch,
        base_price: Number(createdMatch.base_price),
        extra_time_price: Number(createdMatch.extra_time_price),
        total_price: Number(createdMatch.total_price),
      },
      sessionTotal: newTotal,
    };
  },

  async toggleMatchExtraTime(
    sessionId: string,
    matchId: string,
    providedTenantId?: string
  ): Promise<{ match: Match; sessionTotal: number }> {
    const tenantId = resolveTenantId(providedTenantId);
    const client = getSupabaseClient();

    const session = await this.getSessionById(sessionId, tenantId);
    if (!session || session.status !== 'ACTIVE') throw new Error('Session is not active');

    const match = session.matches?.find((m) => m.id === matchId);
    if (!match) throw new Error('Match not found');

    const settings = await this.getSettings(tenantId);
    const isAdding = !match.extra_time;
    const extraPrice = isAdding ? settings.fifa_extra_time_price : 0.00;
    const totalPrice = match.base_price + extraPrice;

    const { data: updated, error } = await client
      .from('matches')
      .update({
        extra_time: isAdding,
        extra_time_price: extraPrice,
        total_price: totalPrice,
      })
      .eq('id', matchId)
      .select()
      .single();

    if (error || !updated) throw new Error(error?.message || 'Failed to update match');

    const updatedSession = await this.getSessionById(sessionId, tenantId);
    const matchesSum = updatedSession?.matches?.reduce((acc, m) => acc + Number(m.total_price), 0) || 0;
    const adjustmentsSum = updatedSession?.adjustments?.reduce((acc, a) => acc + Number(a.adjustment_amount), 0) || 0;
    const newTotal = matchesSum + adjustmentsSum;

    await client.from('sessions').update({ total_amount: newTotal }).eq('id', sessionId);

    return {
      match: {
        ...updated,
        base_price: Number(updated.base_price),
        extra_time_price: Number(updated.extra_time_price),
        total_price: Number(updated.total_price),
      },
      sessionTotal: newTotal,
    };
  },

  async undoLastMatch(sessionId: string, providedTenantId?: string): Promise<{ sessionTotal: number }> {
    const tenantId = resolveTenantId(providedTenantId);
    const client = getSupabaseClient();

    const session = await this.getSessionById(sessionId, tenantId);
    if (!session || session.status !== 'ACTIVE') throw new Error('Session is not active');

    if (!session.matches || session.matches.length === 0) {
      return { sessionTotal: 0 };
    }

    const lastMatch = session.matches[session.matches.length - 1];
    await client.from('matches').delete().eq('id', lastMatch.id);

    const updatedSession = await this.getSessionById(sessionId, tenantId);
    const matchesSum = updatedSession?.matches?.reduce((acc, m) => acc + Number(m.total_price), 0) || 0;
    await client.from('sessions').update({ total_amount: matchesSum }).eq('id', sessionId);

    return { sessionTotal: matchesSum };
  },

  async finishSession(
    sessionId: string,
    paymentMethod: 'CASH' | 'TELEBIRR' | 'CBE',
    reference?: string,
    providedTenantId?: string
  ): Promise<Session> {
    const tenantId = resolveTenantId(providedTenantId);
    const client = getSupabaseClient();

    const session = await this.getSessionById(sessionId, tenantId);
    if (!session || session.status !== 'ACTIVE') throw new Error('Session is already finished');

    const finalTotal = session.total_amount;
    const now = new Date().toISOString();

    await client.from('payments').insert({
      tenant_id: tenantId,
      session_id: sessionId,
      method: paymentMethod,
      amount: finalTotal,
      reference: reference || null,
    });

    await client
      .from('sessions')
      .update({
        status: 'FINISHED',
        payment_status: 'PAID',
        finished_at: now,
      })
      .eq('id', sessionId);

    await client
      .from('consoles')
      .update({ status: 'AVAILABLE' })
      .eq('id', session.console_id)
      .eq('tenant_id', tenantId);

    const finished = await this.getSessionById(sessionId, tenantId);
    if (!finished) throw new Error('Failed to retrieve finished session');
    return finished;
  },

  async createAdjustment(
    sessionId: string,
    adjustmentAmount: number,
    reason: string,
    createdBy = 'Manager',
    providedTenantId?: string
  ): Promise<Adjustment> {
    const tenantId = resolveTenantId(providedTenantId);
    const client = getSupabaseClient();

    const session = await this.getSessionById(sessionId, tenantId);
    if (!session) throw new Error('Session not found');

    const originalAmount = session.total_amount;
    const resultingAmount = originalAmount + adjustmentAmount;

    const { data: adj, error } = await client
      .from('adjustments')
      .insert({
        tenant_id: tenantId,
        session_id: sessionId,
        original_amount: originalAmount,
        adjustment_amount: adjustmentAmount,
        resulting_amount: resultingAmount,
        reason,
        created_by: createdBy,
      })
      .select()
      .single();

    if (error || !adj) throw new Error(error?.message || 'Failed to create adjustment');

    await client.from('sessions').update({ total_amount: resultingAmount }).eq('id', sessionId);

    if (session.status === 'FINISHED') {
      await client.from('payments').update({ amount: resultingAmount }).eq('session_id', sessionId);
    }

    return {
      ...adj,
      original_amount: Number(adj.original_amount),
      adjustment_amount: Number(adj.adjustment_amount),
      resulting_amount: Number(adj.resulting_amount),
    };
  },

  async getSessionsHistory(limit = 100, providedTenantId?: string): Promise<Session[]> {
    const tenantId = resolveTenantId(providedTenantId);
    const client = getSupabaseClient();
    const settings = await this.getSettings(tenantId);
    const query = client
      .from('sessions')
      .select('id, created_at, finished_at')
      .eq('status', 'FINISHED')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit * 2);

    const { data } = await query;
    if (!data) return [];

    const clearedAtTime = settings.history_cleared_at
      ? new Date(settings.history_cleared_at).getTime()
      : 0;

    const filtered = data
      .filter((item) => new Date(item.finished_at || item.created_at).getTime() > clearedAtTime)
      .slice(0, limit);

    const result: Session[] = [];
    for (const item of filtered) {
      const sess = await this.getSessionById(item.id, tenantId);
      if (sess) result.push(sess);
    }
    return result;
  },

  async clearCompletedHistory(providedTenantId?: string): Promise<{ deletedCount: number }> {
    const tenantId = resolveTenantId(providedTenantId);
    const client = getSupabaseClient();
    const now = new Date().toISOString();
    const previousHistory = await this.getSessionsHistory(1000, tenantId);

    await client
      .from('settings')
      .update({ history_cleared_at: now, updated_at: now })
      .eq('tenant_id', tenantId);

    return { deletedCount: previousHistory.length };
  },

  async clearTodayHistory(providedTenantId?: string): Promise<{ deletedCount: number }> {
    return this.clearCompletedHistory(providedTenantId);
  },

  async resetReports(providedTenantId?: string): Promise<{ deletedCount: number }> {
    const tenantId = resolveTenantId(providedTenantId);
    const client = getSupabaseClient();
    const now = new Date().toISOString();

    await client
      .from('settings')
      .update({ reports_reset_at: now, updated_at: now })
      .eq('tenant_id', tenantId);

    return { deletedCount: 1 };
  },

  async getAnalyticsSummary(providedTenantId?: string): Promise<AnalyticsSummary> {
    const tenantId = resolveTenantId(providedTenantId);
    const client = getSupabaseClient();
    const settings = await this.getSettings(tenantId);

    const { data } = await client
      .from('sessions')
      .select('id, created_at, finished_at')
      .eq('status', 'FINISHED')
      .eq('tenant_id', tenantId);

    const resetAtTime = settings.reports_reset_at
      ? new Date(settings.reports_reset_at).getTime()
      : 0;

    const finishedSessions: Session[] = [];
    if (data) {
      const filtered = data.filter((item) => {
        const sessTime = new Date(item.finished_at || item.created_at).getTime();
        return sessTime > resetAtTime;
      });

      for (const item of filtered) {
        const sess = await this.getSessionById(item.id, tenantId);
        if (sess) finishedSessions.push(sess);
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

    const dbConsoles = await this.getConsoles(tenantId);
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

  async getUsers(providedTenantId?: string): Promise<User[]> {
    const tenantId = resolveTenantId(providedTenantId);
    const client = getSupabaseClient();
    const { data } = await client
      .from('users')
      .select('id, tenant_id, username, display_name, role, created_at')
      .eq('tenant_id', tenantId);
    return (data || []) as User[];
  },

  async getUserByUsername(username: string): Promise<User | null> {
    const client = getSupabaseClient();
    const { data } = await client.from('users').select('*').eq('username', username).single();
    return data as User | null;
  },
};

const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);

export const repository: Repository = (isProduction || isSupabaseConfigured)
  ? supabaseRepository
  : fsRepository;

import { isSupabaseConfigured, supabase } from '@/lib/db/supabase';
import { loadDb, saveDb } from '@/lib/db/fs-db';
import { getAuthUser } from '@/lib/auth';
import {
  Console,
  Session,
  Match,
  Payment,
  Adjustment,
  Settings,
  User,
  AnalyticsSummary,
  Tenant,
  AdminStats,
} from '@/types';
import { cryptoRandomUUID } from '@/lib/utils';

export interface Repository {
  getSettings(tenantId?: string): Promise<Settings>;
  updateSettings(fifa_normal_price: number, fifa_extra_time_price: number, currency: string, tenantId?: string): Promise<Settings>;
  getConsoles(tenantId?: string): Promise<Console[]>;
  addConsole(tenantId?: string): Promise<Console>;
  updateConsoleName(id: string, name: string): Promise<Console>;
  toggleConsoleActive(id: string, isActive: boolean): Promise<Console>;
  getActiveSessionByConsoleId(consoleId: string): Promise<Session | null>;
  getSessionById(sessionId: string): Promise<Session | null>;
  startSession(consoleId: string, createdBy?: string, customSessionId?: string, tenantId?: string): Promise<Session>;
  addMatch(sessionId: string, idempotencyKey?: string): Promise<{ match: Match; sessionTotal: number }>;
  toggleMatchExtraTime(sessionId: string, matchId: string): Promise<{ match: Match; sessionTotal: number }>;
  undoLastMatch(sessionId: string): Promise<{ sessionTotal: number }>;
  finishSession(sessionId: string, paymentMethod: 'CASH' | 'TELEBIRR' | 'CBE', reference?: string): Promise<Session>;
  createAdjustment(sessionId: string, adjustmentAmount: number, reason: string, createdBy?: string): Promise<Adjustment>;
  getSessionsHistory(limit?: number, tenantId?: string): Promise<Session[]>;
  clearCompletedHistory(tenantId?: string): Promise<{ deletedCount: number }>;
  clearTodayHistory(tenantId?: string): Promise<{ deletedCount: number }>;
  resetReports(tenantId?: string): Promise<{ deletedCount: number }>;
  getAnalyticsSummary(tenantId?: string): Promise<AnalyticsSummary>;
  getUsers(): Promise<User[]>;
  getUserByUsername(username: string): Promise<User | null>;

  // Tenant / Multi-Customer Owner Admin Methods
  getTenants(): Promise<Tenant[]>;
  getAdminStats(): Promise<AdminStats>;
  registerCustomerTenant(gameZoneName: string, ownerContactName: string, username: string, initialPassword?: string, licenseAmount?: number): Promise<Tenant>;
  updateTenantStatus(id: string, status: 'ACTIVE' | 'SUSPENDED'): Promise<Tenant>;
  updateTenantGameZoneName(id: string, gameZoneName: string): Promise<Tenant>;
  updateTenantPassword(id: string, newPassword?: string): Promise<{ success: boolean }>;
}

async function resolveTenantId(providedTenantId?: string): Promise<string> {
  if (providedTenantId) return providedTenantId;
  const user = await getAuthUser();
  return user?.tenant_id || 't-default';
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

// Helper to determine next TV number safely
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

function isSchemaCacheError(errMessage?: string): boolean {
  if (!errMessage) return false;
  const lower = errMessage.toLowerCase();
  return (
    lower.includes('tenant') ||
    lower.includes('schema cache') ||
    lower.includes('column') ||
    lower.includes('pgrst204') ||
    lower.includes('relation') ||
    lower.includes('does not exist')
  );
}

// --- Local Pure JS FileSystem Persistence Repository ---
const fsRepository: Repository = {
  async getSettings(tenantId?: string): Promise<Settings> {
    const tId = await resolveTenantId(tenantId);
    const db = loadDb();
    const settingsList = Array.isArray(db.settings) ? db.settings : [db.settings];
    const settingsObj = settingsList.find((s) => s.tenant_id === tId) || settingsList[0];
    return settingsObj || { id: 'default', tenant_id: tId, fifa_normal_price: 15.00, fifa_extra_time_price: 5.00, currency: 'ETB', history_cleared_at: undefined, reports_reset_at: undefined, updated_at: new Date().toISOString() };
  },

  async updateSettings(fifa_normal_price: number, fifa_extra_time_price: number, currency: string, tenantId?: string): Promise<Settings> {
    const tId = await resolveTenantId(tenantId);
    const db = loadDb();
    const current = Array.isArray(db.settings) ? db.settings[0] : db.settings;
    const updated: Settings = {
      id: current?.id || 'default',
      tenant_id: tId,
      fifa_normal_price,
      fifa_extra_time_price,
      currency,
      updated_at: new Date().toISOString(),
    };
    db.settings = updated;
    saveDb(db);
    return updated;
  },

  async getConsoles(tenantId?: string): Promise<Console[]> {
    const tId = await resolveTenantId(tenantId);
    const db = loadDb();
    return db.consoles
      .filter((c) => (c.tenant_id || 't-default') === tId)
      .sort((a, b) => a.display_order - b.display_order);
  },

  async addConsole(tenantId?: string): Promise<Console> {
    const tId = await resolveTenantId(tenantId);
    const db = loadDb();
    const tenantConsoles = db.consoles.filter((c) => (c.tenant_id || 't-default') === tId);
    const nextNum = getNextTvNumber(tenantConsoles);
    const newName = `TV ${nextNum}`;
    const newId = `c-${tId}-${nextNum}`;
    const now = new Date().toISOString();

    const newConsole: Console = {
      id: newId,
      tenant_id: tId,
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

  async updateConsoleName(id: string, name: string): Promise<Console> {
    const db = loadDb();
    const consoleObj = db.consoles.find((c) => c.id === id);
    if (!consoleObj) throw new Error('Console TV not found');
    consoleObj.name = name;
    saveDb(db);
    return consoleObj;
  },

  async toggleConsoleActive(id: string, isActive: boolean): Promise<Console> {
    const db = loadDb();
    const consoleObj = db.consoles.find((c) => c.id === id);
    if (!consoleObj) throw new Error('Console TV not found');
    consoleObj.is_active = isActive;
    saveDb(db);
    return consoleObj;
  },

  async getActiveSessionByConsoleId(consoleId: string): Promise<Session | null> {
    const db = loadDb();
    const active = db.sessions.find((s) => s.console_id === consoleId && s.status === 'ACTIVE');
    if (!active) return null;
    return this.getSessionById(active.id);
  },

  async getSessionById(sessionId: string): Promise<Session | null> {
    const db = loadDb();
    const session = db.sessions.find((s) => s.id === sessionId);
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

  async startSession(consoleId: string, createdBy = 'Staff', customSessionId?: string, tenantId?: string): Promise<Session> {
    const db = loadDb();
    const consoleObj = db.consoles.find((c) => c.id === consoleId);
    if (!consoleObj) throw new Error('Console TV not found');

    const active = db.sessions.find((s) => s.console_id === consoleId && s.status === 'ACTIVE');
    if (active) throw new Error('TV already has an active session');

    const tId = tenantId || consoleObj.tenant_id || (await resolveTenantId());
    const sessionId = customSessionId || cryptoRandomUUID();
    const now = new Date().toISOString();

    const newSession: Session = {
      id: sessionId,
      console_id: consoleId,
      tenant_id: tId,
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

    const created = await this.getSessionById(sessionId);
    if (!created) throw new Error('Failed to retrieve created session');
    return created;
  },

  async addMatch(sessionId: string, idempotencyKey?: string): Promise<{ match: Match; sessionTotal: number }> {
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

    const settings = Array.isArray(db.settings) ? db.settings[0] : db.settings;
    const sessionMatches = db.matches.filter((m) => m.session_id === sessionId);
    const nextMatchNum = sessionMatches.length > 0
      ? Math.max(...sessionMatches.map((m) => m.match_number)) + 1
      : 1;

    const matchId = cryptoRandomUUID();
    const now = new Date().toISOString();
    const basePrice = settings?.fifa_normal_price ?? 15.00;

    const newMatch: Match = {
      id: matchId,
      session_id: sessionId,
      tenant_id: session.tenant_id || 't-default',
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

  async toggleMatchExtraTime(sessionId: string, matchId: string): Promise<{ match: Match; sessionTotal: number }> {
    const db = loadDb();
    const session = db.sessions.find((s) => s.id === sessionId);
    if (!session || session.status !== 'ACTIVE') {
      throw new Error('Session is not active');
    }

    const match = db.matches.find((m) => m.id === matchId && m.session_id === sessionId);
    if (!match) throw new Error('Match not found');

    const settings = Array.isArray(db.settings) ? db.settings[0] : db.settings;
    const extraPrice = settings?.fifa_extra_time_price ?? 5.00;

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

  async undoLastMatch(sessionId: string): Promise<{ sessionTotal: number }> {
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

  async finishSession(sessionId: string, paymentMethod: 'CASH' | 'TELEBIRR' | 'CBE', reference?: string): Promise<Session> {
    const db = loadDb();
    const session = db.sessions.find((s) => s.id === sessionId);
    if (!session) throw new Error('Session not found');
    if (session.status !== 'ACTIVE') throw new Error('Session is already finished');

    const finalTotal = syncFsSessionTotal(sessionId);
    const now = new Date().toISOString();
    const paymentId = cryptoRandomUUID();

    const newPayment: Payment = {
      id: paymentId,
      session_id: sessionId,
      tenant_id: session.tenant_id || 't-default',
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

    const finished = await this.getSessionById(sessionId);
    if (!finished) throw new Error('Failed to fetch finished session');
    return finished;
  },

  async createAdjustment(sessionId: string, adjustmentAmount: number, reason: string, createdBy = 'Manager'): Promise<Adjustment> {
    const db = loadDb();
    const session = db.sessions.find((s) => s.id === sessionId);
    if (!session) throw new Error('Session not found');

    const id = cryptoRandomUUID();
    const now = new Date().toISOString();
    const originalAmount = session.total_amount;
    const resultingAmount = originalAmount + adjustmentAmount;

    const newAdjustment: Adjustment = {
      id,
      session_id: sessionId,
      tenant_id: session.tenant_id || 't-default',
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

  async getSessionsHistory(limit = 100, tenantId?: string): Promise<Session[]> {
    const tId = await resolveTenantId(tenantId);
    const db = loadDb();
    const settings = await this.getSettings(tId);
    const clearedAt = settings.history_cleared_at ? new Date(settings.history_cleared_at).getTime() : 0;

    const sorted = db.sessions
      .filter((s) => (s.tenant_id || 't-default') === tId)
      .filter((s) => s.status === 'FINISHED')
      .filter((s) => new Date(s.finished_at || s.created_at).getTime() > clearedAt)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);

    const result: Session[] = [];
    for (const item of sorted) {
      const sess = await this.getSessionById(item.id);
      if (sess) result.push(sess);
    }
    return result;
  },

  async clearCompletedHistory(tenantId?: string): Promise<{ deletedCount: number }> {
    const tId = await resolveTenantId(tenantId);
    const db = loadDb();
    const settings = Array.isArray(db.settings) ? db.settings[0] : db.settings;
    const now = new Date().toISOString();

    const previousHistory = await this.getSessionsHistory(1000, tId);
    const count = previousHistory.length;

    if (settings) {
      settings.history_cleared_at = now;
      settings.updated_at = now;
    } else {
      db.settings = { id: 'default', tenant_id: tId, fifa_normal_price: 15, fifa_extra_time_price: 5, currency: 'ETB', history_cleared_at: now, updated_at: now };
    }

    saveDb(db);
    return { deletedCount: count };
  },

  async clearTodayHistory(tenantId?: string): Promise<{ deletedCount: number }> {
    return this.clearCompletedHistory(tenantId);
  },

  async resetReports(tenantId?: string): Promise<{ deletedCount: number }> {
    const tId = await resolveTenantId(tenantId);
    const db = loadDb();
    const settings = Array.isArray(db.settings) ? db.settings[0] : db.settings;
    const now = new Date().toISOString();

    if (settings) {
      settings.reports_reset_at = now;
      settings.updated_at = now;
    } else {
      db.settings = { id: 'default', tenant_id: tId, fifa_normal_price: 15, fifa_extra_time_price: 5, currency: 'ETB', reports_reset_at: now, updated_at: now };
    }

    saveDb(db);
    return { deletedCount: 1 };
  },

  async getAnalyticsSummary(tenantId?: string): Promise<AnalyticsSummary> {
    const tId = await resolveTenantId(tenantId);
    const db = loadDb();
    const settings = await this.getSettings(tId);
    const resetAt = settings.reports_reset_at ? new Date(settings.reports_reset_at).getTime() : 0;

    const allFinishedSessions = db.sessions.filter((s) => (s.tenant_id || 't-default') === tId && s.status === 'FINISHED');
    const finishedSessions: Session[] = [];
    for (const item of allFinishedSessions) {
      if (new Date(item.finished_at || item.created_at).getTime() > resetAt) {
        const full = await this.getSessionById(item.id);
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

    const dbConsoles = await this.getConsoles(tId);
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
    const db = loadDb();
    return db.users;
  },

  async getUserByUsername(username: string): Promise<User | null> {
    const db = loadDb();
    const user = db.users.find((u) => u.username === username);
    return user || null;
  },

  async getTenants(): Promise<Tenant[]> {
    const db = loadDb();
    return db.tenants || [];
  },

  async getAdminStats(): Promise<AdminStats> {
    const db = loadDb();
    const tenants = db.tenants || [];
    const totalCustomers = tenants.length;
    const activeCustomers = tenants.filter((t) => t.status === 'ACTIVE').length;
    const suspendedCustomers = tenants.filter((t) => t.status === 'SUSPENDED').length;
    const totalLicenseRevenue = tenants.reduce((acc, t) => acc + (t.license_amount || 5000), 0);

    return {
      totalCustomers,
      activeCustomers,
      suspendedCustomers,
      totalLicenseRevenue,
    };
  },

  async registerCustomerTenant(gameZoneName: string, ownerContactName: string, username: string, initialPassword = '1234', licenseAmount = 5000): Promise<Tenant> {
    const db = loadDb();
    if (!db.tenants) db.tenants = [];

    const existingUsername = db.tenants.find((t) => t.username.toLowerCase() === username.toLowerCase());
    if (existingUsername) throw new Error(`Username "${username}" is already taken.`);

    const tenantId = `t-${cryptoRandomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const newTenant: Tenant = {
      id: tenantId,
      game_zone_name: gameZoneName,
      owner_contact_name: ownerContactName,
      username: username.toLowerCase().trim(),
      password: initialPassword,
      license_amount: licenseAmount,
      license_status: 'PAID',
      status: 'ACTIVE',
      created_at: now,
    };

    db.tenants.push(newTenant);

    // Create 3 default TVs for this new customer
    db.consoles.push(
      { id: `c-${tenantId}-1`, tenant_id: tenantId, name: 'TV 1', status: 'AVAILABLE', display_order: 1, is_active: true, created_at: now },
      { id: `c-${tenantId}-2`, tenant_id: tenantId, name: 'TV 2', status: 'AVAILABLE', display_order: 2, is_active: true, created_at: now },
      { id: `c-${tenantId}-3`, tenant_id: tenantId, name: 'TV 3', status: 'AVAILABLE', display_order: 3, is_active: true, created_at: now }
    );

    saveDb(db);
    return newTenant;
  },

  async updateTenantStatus(id: string, status: 'ACTIVE' | 'SUSPENDED'): Promise<Tenant> {
    const db = loadDb();
    const tenant = (db.tenants || []).find((t) => t.id === id);
    if (!tenant) throw new Error('Customer tenant not found');
    tenant.status = status;
    saveDb(db);
    return tenant;
  },

  async updateTenantGameZoneName(id: string, gameZoneName: string): Promise<Tenant> {
    const db = loadDb();
    const tenant = (db.tenants || []).find((t) => t.id === id);
    if (!tenant) throw new Error('Customer tenant not found');
    tenant.game_zone_name = gameZoneName;
    saveDb(db);
    return tenant;
  },

  async updateTenantPassword(id: string, newPassword?: string): Promise<{ success: boolean }> {
    const db = loadDb();
    const tenant = (db.tenants || []).find((t) => t.id === id);
    if (!tenant) throw new Error('Tenant not found');
    tenant.password = newPassword;
    saveDb(db);
    return { success: true };
  },
};

// Helper to check Supabase client instance
function getSupabaseClient() {
  if (!supabase) {
    throw new Error('Supabase configuration error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY are missing in production.');
  }
  return supabase;
}

// In-memory fallback array for registered tenants if remote Supabase database table 'public.tenants' is not yet created
const memoryTenantsFallback: Tenant[] = [
  {
    id: 't-default',
    game_zone_name: 'Ghost Game Center',
    owner_contact_name: 'Ghostvon Owner',
    username: 'ghostvon',
    password: '1234',
    license_amount: 5000,
    license_status: 'PAID',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
  },
];

// --- Supabase Implementation ---
const supabaseRepository: Repository = {
  async getSettings(tenantId?: string): Promise<Settings> {
    const tId = await resolveTenantId(tenantId);
    const client = getSupabaseClient();

    let { data, error } = await client.from('settings').select('*').eq('tenant_id', tId).limit(1);
    if (error && isSchemaCacheError(error.message)) {
      const fallback = await client.from('settings').select('*').limit(1);
      data = fallback.data;
    }

    const settingsData = data && data.length > 0 ? data[0] : null;

    let history_cleared_at = settingsData?.history_cleared_at || undefined;
    let reports_reset_at = settingsData?.reports_reset_at || undefined;

    if (!history_cleared_at) {
      try {
        const { data: adjClear } = await client
          .from('adjustments')
          .select('reason')
          .like('reason', 'SYSTEM_HISTORY_CLEAR:%')
          .order('created_at', { ascending: false })
          .limit(1);

        if (adjClear && adjClear.length > 0) {
          history_cleared_at = adjClear[0].reason.replace('SYSTEM_HISTORY_CLEAR:', '');
        }
      } catch (err) {
        // ignore fallback check if adjustments table fails
      }
    }

    if (!reports_reset_at) {
      try {
        const { data: adjReset } = await client
          .from('adjustments')
          .select('reason')
          .like('reason', 'SYSTEM_REPORTS_RESET:%')
          .order('created_at', { ascending: false })
          .limit(1);

        if (adjReset && adjReset.length > 0) {
          reports_reset_at = adjReset[0].reason.replace('SYSTEM_REPORTS_RESET:', '');
        }
      } catch (err) {
        // ignore fallback
      }
    }

    return {
      id: settingsData?.id || 'default',
      tenant_id: tId,
      fifa_normal_price: Number(settingsData?.fifa_normal_price || 15.00),
      fifa_extra_time_price: Number(settingsData?.fifa_extra_time_price || 5.00),
      currency: settingsData?.currency || 'ETB',
      history_cleared_at,
      reports_reset_at,
      updated_at: settingsData?.updated_at || new Date().toISOString(),
    };
  },

  async updateSettings(fifa_normal_price: number, fifa_extra_time_price: number, currency: string, tenantId?: string): Promise<Settings> {
    const tId = await resolveTenantId(tenantId);
    const client = getSupabaseClient();

    let { data: existing, error: selErr } = await client.from('settings').select('id').eq('tenant_id', tId).limit(1);
    if (selErr && isSchemaCacheError(selErr.message)) {
      const fallback = await client.from('settings').select('id').limit(1);
      existing = fallback.data;
    }

    if (existing && existing.length > 0) {
      const { data, error } = await client
        .from('settings')
        .update({ fifa_normal_price, fifa_extra_time_price, currency, updated_at: new Date().toISOString() })
        .eq('id', existing[0].id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return {
        id: data.id,
        tenant_id: tId,
        fifa_normal_price: Number(data.fifa_normal_price),
        fifa_extra_time_price: Number(data.fifa_extra_time_price),
        currency: data.currency,
        updated_at: data.updated_at,
      };
    } else {
      const payload: any = { tenant_id: tId, fifa_normal_price, fifa_extra_time_price, currency, updated_at: new Date().toISOString() };
      let { data, error } = await client
        .from('settings')
        .insert(payload)
        .select()
        .single();

      if (error && isSchemaCacheError(error.message)) {
        delete payload.tenant_id;
        const retry = await client.from('settings').insert(payload).select().single();
        data = retry.data;
        error = retry.error;
      }

      if (error) throw new Error(error.message);
      return {
        id: data.id,
        tenant_id: tId,
        fifa_normal_price: Number(data.fifa_normal_price),
        fifa_extra_time_price: Number(data.fifa_extra_time_price),
        currency: data.currency,
        updated_at: data.updated_at,
      };
    }
  },

  async getConsoles(tenantId?: string): Promise<Console[]> {
    const tId = await resolveTenantId(tenantId);
    const client = getSupabaseClient();

    let { data, error } = await client
      .from('consoles')
      .select('*')
      .eq('tenant_id', tId)
      .order('display_order', { ascending: true });

    if (error && isSchemaCacheError(error.message)) {
      const fallback = await client
        .from('consoles')
        .select('*')
        .order('display_order', { ascending: true });
      data = fallback.data;
      error = fallback.error;
    }

    if (error || !data) return [];
    return data as Console[];
  },

  async addConsole(tenantId?: string): Promise<Console> {
    const tId = await resolveTenantId(tenantId);
    const client = getSupabaseClient();
    const consoles = await this.getConsoles(tId);
    const nextNum = getNextTvNumber(consoles);
    const name = `TV ${nextNum}`;

    const payload: any = {
      name,
      tenant_id: tId,
      status: 'AVAILABLE',
      display_order: consoles.length + 1,
      is_active: true
    };

    let { data, error } = await client.from('consoles').insert(payload).select().single();

    if (error && isSchemaCacheError(error.message)) {
      delete payload.tenant_id;
      const retry = await client.from('consoles').insert(payload).select().single();
      data = retry.data;
      error = retry.error;
    }

    if (error || !data) throw new Error(error?.message || 'Failed to add TV station');
    return data as Console;
  },

  async updateConsoleName(id: string, name: string): Promise<Console> {
    const client = getSupabaseClient();
    const { data, error } = await client.from('consoles').update({ name }).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return data as Console;
  },

  async toggleConsoleActive(id: string, isActive: boolean): Promise<Console> {
    const client = getSupabaseClient();
    const { data, error } = await client.from('consoles').update({ is_active: isActive }).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return data as Console;
  },

  async getActiveSessionByConsoleId(consoleId: string): Promise<Session | null> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('sessions')
      .select('id')
      .eq('console_id', consoleId)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) return null;
    return this.getSessionById(data[0].id);
  },

  async getSessionById(sessionId: string): Promise<Session | null> {
    const client = getSupabaseClient();
    const { data: session, error } = await client.from('sessions').select('*').eq('id', sessionId).single();
    if (error || !session) return null;

    const { data: consoleObj } = await client.from('consoles').select('name').eq('id', session.console_id).single();
    const { data: matches } = await client.from('matches').select('*').eq('session_id', sessionId).order('match_number', { ascending: true });
    const { data: payments } = await client.from('payments').select('*').eq('session_id', sessionId);
    const { data: adjustments } = await client.from('adjustments').select('*').eq('session_id', sessionId).order('created_at', { ascending: true });

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

  async startSession(consoleId: string, createdBy = 'Staff', customSessionId?: string, tenantId?: string): Promise<Session> {
    const client = getSupabaseClient();

    const { data: existing } = await client
      .from('sessions')
      .select('id')
      .eq('console_id', consoleId)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .limit(1);

    if (existing && existing.length > 0) {
      throw new Error('TV already has an active session');
    }

    const tId = await resolveTenantId(tenantId);

    const insertPayload: any = {
      console_id: consoleId,
      tenant_id: tId,
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

    let { data: session, error } = await client
      .from('sessions')
      .insert(insertPayload)
      .select()
      .single();

    if (error && isSchemaCacheError(error.message)) {
      delete insertPayload.tenant_id;
      const retry = await client.from('sessions').insert(insertPayload).select().single();
      session = retry.data;
      error = retry.error;
    }

    if (error || !session) throw new Error(error?.message || 'Failed to start session');

    await client.from('consoles').update({ status: 'PLAYING' }).eq('id', consoleId);

    const fullSession = await this.getSessionById(session.id);
    if (!fullSession) throw new Error('Session retrieval failed');
    return fullSession;
  },

  async addMatch(sessionId: string, idempotencyKey?: string): Promise<{ match: Match; sessionTotal: number }> {
    const client = getSupabaseClient();

    const session = await this.getSessionById(sessionId);
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

    const settings = await this.getSettings(session.tenant_id);
    const nextMatchNum = (session.matches?.length || 0) + 1;
    const basePrice = settings.fifa_normal_price;

    const matchPayload: any = {
      session_id: sessionId,
      tenant_id: session.tenant_id || 't-default',
      match_number: nextMatchNum,
      base_price: basePrice,
      extra_time: false,
      extra_time_price: 0.00,
      total_price: basePrice,
      client_idempotency_key: idempotencyKey || null,
    };

    let { data: createdMatch, error } = await client
      .from('matches')
      .insert(matchPayload)
      .select()
      .single();

    if (error && isSchemaCacheError(error.message)) {
      delete matchPayload.tenant_id;
      const retry = await client.from('matches').insert(matchPayload).select().single();
      createdMatch = retry.data;
      error = retry.error;
    }

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

  async toggleMatchExtraTime(sessionId: string, matchId: string): Promise<{ match: Match; sessionTotal: number }> {
    const client = getSupabaseClient();

    const session = await this.getSessionById(sessionId);
    if (!session || session.status !== 'ACTIVE') throw new Error('Session is not active');

    const match = session.matches?.find((m) => m.id === matchId);
    if (!match) throw new Error('Match not found');

    const settings = await this.getSettings(session.tenant_id);
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

    const updatedSession = await this.getSessionById(sessionId);
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

  async undoLastMatch(sessionId: string): Promise<{ sessionTotal: number }> {
    const client = getSupabaseClient();

    const session = await this.getSessionById(sessionId);
    if (!session || session.status !== 'ACTIVE') throw new Error('Session is not active');

    if (!session.matches || session.matches.length === 0) {
      return { sessionTotal: 0 };
    }

    const lastMatch = session.matches[session.matches.length - 1];
    await client.from('matches').delete().eq('id', lastMatch.id);

    const updatedSession = await this.getSessionById(sessionId);
    const matchesSum = updatedSession?.matches?.reduce((acc, m) => acc + Number(m.total_price), 0) || 0;
    await client.from('sessions').update({ total_amount: matchesSum }).eq('id', sessionId);

    return { sessionTotal: matchesSum };
  },

  async finishSession(sessionId: string, paymentMethod: 'CASH' | 'TELEBIRR' | 'CBE', reference?: string): Promise<Session> {
    const client = getSupabaseClient();

    const session = await this.getSessionById(sessionId);
    if (!session || session.status !== 'ACTIVE') throw new Error('Session is already finished');

    const finalTotal = session.total_amount;
    const now = new Date().toISOString();

    const paymentPayload: any = {
      session_id: sessionId,
      tenant_id: session.tenant_id || 't-default',
      method: paymentMethod,
      amount: finalTotal,
      reference: reference || null,
    };

    let { error } = await client.from('payments').insert(paymentPayload);
    if (error && isSchemaCacheError(error.message)) {
      delete paymentPayload.tenant_id;
      await client.from('payments').insert(paymentPayload);
    }

    await client
      .from('sessions')
      .update({
        status: 'FINISHED',
        payment_status: 'PAID',
        finished_at: now,
      })
      .eq('id', sessionId);

    await client.from('consoles').update({ status: 'AVAILABLE' }).eq('id', session.console_id);

    const finished = await this.getSessionById(sessionId);
    if (!finished) throw new Error('Failed to retrieve finished session');
    return finished;
  },

  async createAdjustment(sessionId: string, adjustmentAmount: number, reason: string, createdBy = 'Manager'): Promise<Adjustment> {
    const client = getSupabaseClient();

    const session = await this.getSessionById(sessionId);
    if (!session) throw new Error('Session not found');

    const originalAmount = session.total_amount;
    const resultingAmount = originalAmount + adjustmentAmount;

    const adjPayload: any = {
      session_id: sessionId,
      tenant_id: session.tenant_id || 't-default',
      original_amount: originalAmount,
      adjustment_amount: adjustmentAmount,
      resulting_amount: resultingAmount,
      reason,
      created_by: createdBy,
    };

    let { data: adj, error } = await client
      .from('adjustments')
      .insert(adjPayload)
      .select()
      .single();

    if (error && isSchemaCacheError(error.message)) {
      delete adjPayload.tenant_id;
      const retry = await client.from('adjustments').insert(adjPayload).select().single();
      adj = retry.data;
      error = retry.error;
    }

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

  async getSessionsHistory(limit = 100, tenantId?: string): Promise<Session[]> {
    const tId = await resolveTenantId(tenantId);
    const client = getSupabaseClient();
    const settings = await this.getSettings(tId);

    let { data, error } = await client
      .from('sessions')
      .select('id, created_at, finished_at')
      .eq('tenant_id', tId)
      .eq('status', 'FINISHED')
      .order('created_at', { ascending: false })
      .limit(limit * 2);

    if (error && isSchemaCacheError(error.message)) {
      const fallback = await client
        .from('sessions')
        .select('id, created_at, finished_at')
        .eq('status', 'FINISHED')
        .order('created_at', { ascending: false })
        .limit(limit * 2);
      data = fallback.data;
    }

    if (!data) return [];

    const clearedAtTime = settings.history_cleared_at
      ? new Date(settings.history_cleared_at).getTime()
      : 0;

    const filtered = data.filter((item) => {
      const sessTime = new Date(item.finished_at || item.created_at).getTime();
      return sessTime > clearedAtTime;
    }).slice(0, limit);

    const result: Session[] = [];
    for (const item of filtered) {
      const sess = await this.getSessionById(item.id);
      if (sess) result.push(sess);
    }
    return result;
  },

  async clearCompletedHistory(tenantId?: string): Promise<{ deletedCount: number }> {
    const tId = await resolveTenantId(tenantId);
    const client = getSupabaseClient();
    const now = new Date().toISOString();
    const previousHistory = await this.getSessionsHistory(1000, tId);

    try {
      await client
        .from('settings')
        .update({ history_cleared_at: now, updated_at: now })
        .eq('tenant_id', tId);
    } catch (err) {
      // ignore
    }

    try {
      const { data: session } = await client.from('sessions').select('id').limit(1);
      const sessionId = session && session.length > 0 ? session[0].id : null;

      if (sessionId) {
        const payload: any = {
          session_id: sessionId,
          tenant_id: tId,
          original_amount: 0,
          adjustment_amount: 0,
          resulting_amount: 0,
          reason: 'SYSTEM_HISTORY_CLEAR:' + now,
          created_by: 'System',
        };
        let { error } = await client.from('adjustments').insert(payload);
        if (error && isSchemaCacheError(error.message)) {
          delete payload.tenant_id;
          await client.from('adjustments').insert(payload);
        }
      }
    } catch (err) {
      // ignore
    }

    return { deletedCount: previousHistory.length };
  },

  async clearTodayHistory(tenantId?: string): Promise<{ deletedCount: number }> {
    return this.clearCompletedHistory(tenantId);
  },

  async resetReports(tenantId?: string): Promise<{ deletedCount: number }> {
    const tId = await resolveTenantId(tenantId);
    const client = getSupabaseClient();
    const now = new Date().toISOString();

    try {
      await client
        .from('settings')
        .update({ reports_reset_at: now, updated_at: now })
        .eq('tenant_id', tId);
    } catch (err) {
      // ignore
    }

    try {
      const { data: session } = await client.from('sessions').select('id').limit(1);
      const sessionId = session && session.length > 0 ? session[0].id : null;

      if (sessionId) {
        const payload: any = {
          session_id: sessionId,
          tenant_id: tId,
          original_amount: 0,
          adjustment_amount: 0,
          resulting_amount: 0,
          reason: 'SYSTEM_REPORTS_RESET:' + now,
          created_by: 'System',
        };
        let { error } = await client.from('adjustments').insert(payload);
        if (error && isSchemaCacheError(error.message)) {
          delete payload.tenant_id;
          await client.from('adjustments').insert(payload);
        }
      }
    } catch (err) {
      // ignore
    }

    return { deletedCount: 1 };
  },

  async getAnalyticsSummary(tenantId?: string): Promise<AnalyticsSummary> {
    const tId = await resolveTenantId(tenantId);
    const client = getSupabaseClient();
    const settings = await this.getSettings(tId);

    let { data, error } = await client
      .from('sessions')
      .select('id, created_at, finished_at')
      .eq('tenant_id', tId)
      .eq('status', 'FINISHED');

    if (error && isSchemaCacheError(error.message)) {
      const fallback = await client
        .from('sessions')
        .select('id, created_at, finished_at')
        .eq('status', 'FINISHED');
      data = fallback.data;
    }

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
        const sess = await this.getSessionById(item.id);
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

    const dbConsoles = await this.getConsoles(tId);
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
    const client = getSupabaseClient();
    const { data } = await client.from('users').select('id, username, display_name, role, created_at');
    return (data || []) as User[];
  },

  async getUserByUsername(username: string): Promise<User | null> {
    const client = getSupabaseClient();
    const { data } = await client.from('users').select('*').eq('username', username).single();
    return data as User | null;
  },

  async getTenants(): Promise<Tenant[]> {
    const client = getSupabaseClient();
    const { data, error } = await client.from('tenants').select('*').order('created_at', { ascending: false });
    if (error || !data) {
      return memoryTenantsFallback;
    }
    return data as Tenant[];
  },

  async getAdminStats(): Promise<AdminStats> {
    const tenants = await this.getTenants();
    const totalCustomers = tenants.length;
    const activeCustomers = tenants.filter((t) => t.status === 'ACTIVE').length;
    const suspendedCustomers = tenants.filter((t) => t.status === 'SUSPENDED').length;
    const totalLicenseRevenue = tenants.reduce((acc, t) => acc + Number(t.license_amount || 5000), 0);

    return {
      totalCustomers,
      activeCustomers,
      suspendedCustomers,
      totalLicenseRevenue,
    };
  },

  async registerCustomerTenant(gameZoneName: string, ownerContactName: string, username: string, initialPassword = '1234', licenseAmount = 5000): Promise<Tenant> {
    const client = getSupabaseClient();
    const lowerUsername = username.toLowerCase().trim();

    try {
      const { data: existing } = await client
        .from('tenants')
        .select('id')
        .eq('username', lowerUsername)
        .single();

      if (existing) {
        throw new Error(`Username "${username}" is already taken.`);
      }
    } catch (err: any) {
      if (err?.message && !isSchemaCacheError(err.message)) {
        throw err;
      }
      // Check in memory fallback
      if (memoryTenantsFallback.some((t) => t.username.toLowerCase() === lowerUsername)) {
        throw new Error(`Username "${username}" is already taken.`);
      }
    }

    const tenantId = `t-${cryptoRandomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const newTenantRecord: Tenant = {
      id: tenantId,
      game_zone_name: gameZoneName,
      owner_contact_name: ownerContactName,
      username: lowerUsername,
      password: initialPassword,
      license_amount: licenseAmount,
      license_status: 'PAID',
      status: 'ACTIVE',
      created_at: now,
    };

    let registeredTenant: Tenant | null = null;

    try {
      const { data: tenant, error } = await client
        .from('tenants')
        .insert({
          id: tenantId,
          game_zone_name: gameZoneName,
          owner_contact_name: ownerContactName,
          username: lowerUsername,
          password: initialPassword,
          license_amount: licenseAmount,
          license_status: 'PAID',
          status: 'ACTIVE',
        })
        .select()
        .single();

      if (error && isSchemaCacheError(error.message)) {
        // Table doesn't exist in Supabase schema yet; keep in memory fallback
        memoryTenantsFallback.unshift(newTenantRecord);
        registeredTenant = newTenantRecord;
      } else if (error || !tenant) {
        throw new Error(error?.message || 'Failed to register customer tenant');
      } else {
        registeredTenant = tenant as Tenant;
      }
    } catch (err: any) {
      if (isSchemaCacheError(err?.message)) {
        memoryTenantsFallback.unshift(newTenantRecord);
        registeredTenant = newTenantRecord;
      } else {
        throw err;
      }
    }

    // Try creating 3 default TV consoles for new tenant in Supabase
    try {
      await client.from('consoles').insert([
        { tenant_id: tenantId, name: 'TV 1', status: 'AVAILABLE', display_order: 1, is_active: true },
        { tenant_id: tenantId, name: 'TV 2', status: 'AVAILABLE', display_order: 2, is_active: true },
        { tenant_id: tenantId, name: 'TV 3', status: 'AVAILABLE', display_order: 3, is_active: true },
      ]);
    } catch (err) {
      // Ignore console creation error if tenant_id column does not exist on remote consoles
    }

    return registeredTenant!;
  },

  async updateTenantStatus(id: string, status: 'ACTIVE' | 'SUSPENDED'): Promise<Tenant> {
    const client = getSupabaseClient();
    try {
      const { data, error } = await client
        .from('tenants')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error && isSchemaCacheError(error.message)) {
        const mem = memoryTenantsFallback.find((t) => t.id === id);
        if (mem) {
          mem.status = status;
          return mem;
        }
      }
      if (error || !data) throw new Error(error?.message || 'Failed to update customer status');
      return data as Tenant;
    } catch (err: any) {
      const mem = memoryTenantsFallback.find((t) => t.id === id);
      if (mem) {
        mem.status = status;
        return mem;
      }
      throw err;
    }
  },

  async updateTenantGameZoneName(id: string, gameZoneName: string): Promise<Tenant> {
    const client = getSupabaseClient();
    try {
      const { data, error } = await client
        .from('tenants')
        .update({ game_zone_name: gameZoneName })
        .eq('id', id)
        .select()
        .single();

      if (error && isSchemaCacheError(error.message)) {
        const mem = memoryTenantsFallback.find((t) => t.id === id);
        if (mem) {
          mem.game_zone_name = gameZoneName;
          return mem;
        }
      }
      if (error || !data) throw new Error(error?.message || 'Failed to update Game Zone name');
      return data as Tenant;
    } catch (err: any) {
      const mem = memoryTenantsFallback.find((t) => t.id === id);
      if (mem) {
        mem.game_zone_name = gameZoneName;
        return mem;
      }
      throw err;
    }
  },

  async updateTenantPassword(id: string, newPassword?: string): Promise<{ success: boolean }> {
    const client = getSupabaseClient();
    try {
      const { error } = await client
        .from('tenants')
        .update({ password: newPassword })
        .eq('id', id);

      if (error && isSchemaCacheError(error.message)) {
        const mem = memoryTenantsFallback.find((t) => t.id === id);
        if (mem) mem.password = newPassword;
        return { success: true };
      }
      if (error) throw new Error(error.message);
      return { success: true };
    } catch (err: any) {
      const mem = memoryTenantsFallback.find((t) => t.id === id);
      if (mem) mem.password = newPassword;
      return { success: true };
    }
  },
};

const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);

// In production or when explicitly configured, use Supabase repository. In dev/test without Supabase, use local filesystem repository.
export const repository: Repository = (isProduction || isSupabaseConfigured)
  ? supabaseRepository
  : fsRepository;

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
  getSettings(): Promise<Settings>;
  updateSettings(fifa_normal_price: number, fifa_extra_time_price: number, currency: string): Promise<Settings>;
  getConsoles(): Promise<Console[]>;
  addConsole(): Promise<Console>;
  updateConsoleName(id: string, name: string): Promise<Console>;
  toggleConsoleActive(id: string, isActive: boolean): Promise<Console>;
  getActiveSessionByConsoleId(consoleId: string): Promise<Session | null>;
  getSessionById(sessionId: string): Promise<Session | null>;
  startSession(consoleId: string, createdBy?: string): Promise<Session>;
  addMatch(sessionId: string, idempotencyKey?: string): Promise<{ match: Match; sessionTotal: number }>;
  toggleMatchExtraTime(sessionId: string, matchId: string): Promise<{ match: Match; sessionTotal: number }>;
  undoLastMatch(sessionId: string): Promise<{ sessionTotal: number }>;
  finishSession(sessionId: string, paymentMethod: 'CASH' | 'TELEBIRR' | 'CBE', reference?: string): Promise<Session>;
  createAdjustment(sessionId: string, adjustmentAmount: number, reason: string, createdBy?: string): Promise<Adjustment>;
  getSessionsHistory(limit?: number): Promise<Session[]>;
  getAnalyticsSummary(): Promise<AnalyticsSummary>;
  getUsers(): Promise<User[]>;
  getUserByUsername(username: string): Promise<User | null>;
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

// --- Local Pure JS FileSystem Persistence Repository ---
const fsRepository: Repository = {
  async getSettings(): Promise<Settings> {
    const db = loadDb();
    const settingsObj = Array.isArray(db.settings) ? db.settings[0] : db.settings;
    return settingsObj || { id: 'default', fifa_normal_price: 15.00, fifa_extra_time_price: 5.00, currency: 'ETB', updated_at: new Date().toISOString() };
  },

  async updateSettings(fifa_normal_price: number, fifa_extra_time_price: number, currency: string): Promise<Settings> {
    const db = loadDb();
    const current = Array.isArray(db.settings) ? db.settings[0] : db.settings;
    const updated: Settings = {
      id: current?.id || 'default',
      fifa_normal_price,
      fifa_extra_time_price,
      currency,
      updated_at: new Date().toISOString(),
    };
    db.settings = updated;
    saveDb(db);
    return updated;
  },

  async getConsoles(): Promise<Console[]> {
    const db = loadDb();
    return [...db.consoles].sort((a, b) => a.display_order - b.display_order);
  },

  async addConsole(): Promise<Console> {
    const db = loadDb();
    const nextNum = getNextTvNumber(db.consoles);
    const newName = `TV ${nextNum}`;
    const newId = `c-${nextNum}`;
    const now = new Date().toISOString();

    const newConsole: Console = {
      id: newId,
      name: newName,
      status: 'AVAILABLE',
      display_order: db.consoles.length + 1,
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

  async startSession(consoleId: string, createdBy = 'Staff'): Promise<Session> {
    const db = loadDb();
    const consoleObj = db.consoles.find((c) => c.id === consoleId);
    if (!consoleObj) throw new Error('Console TV not found');

    const active = db.sessions.find((s) => s.console_id === consoleId && s.status === 'ACTIVE');
    if (active) throw new Error('TV already has an active session');

    const sessionId = cryptoRandomUUID();
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

  async getSessionsHistory(limit = 100): Promise<Session[]> {
    const db = loadDb();
    const sorted = [...db.sessions]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);

    const result: Session[] = [];
    for (const item of sorted) {
      const sess = await this.getSessionById(item.id);
      if (sess) result.push(sess);
    }
    return result;
  },

  async getAnalyticsSummary(): Promise<AnalyticsSummary> {
    const sessions = await this.getSessionsHistory(1000);
    const finishedSessions = sessions.filter((s) => s.status === 'FINISHED');

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
};

// --- Supabase Implementation ---
const supabaseRepository: Repository = {
  async getSettings(): Promise<Settings> {
    if (!supabase) return fsRepository.getSettings();
    const { data, error } = await supabase.from('settings').select('*').eq('id', 'default').single();
    if (error || !data) return fsRepository.getSettings();
    return {
      id: data.id,
      fifa_normal_price: Number(data.fifa_normal_price),
      fifa_extra_time_price: Number(data.fifa_extra_time_price),
      currency: data.currency,
      updated_at: data.updated_at,
    };
  },

  async updateSettings(fifa_normal_price: number, fifa_extra_time_price: number, currency: string): Promise<Settings> {
    if (!supabase) return fsRepository.updateSettings(fifa_normal_price, fifa_extra_time_price, currency);
    const { data, error } = await supabase
      .from('settings')
      .update({ fifa_normal_price, fifa_extra_time_price, currency, updated_at: new Date().toISOString() })
      .eq('id', 'default')
      .select()
      .single();

    if (error) throw new Error(error.message);
    return {
      id: data.id,
      fifa_normal_price: Number(data.fifa_normal_price),
      fifa_extra_time_price: Number(data.fifa_extra_time_price),
      currency: data.currency,
      updated_at: data.updated_at,
    };
  },

  async getConsoles(): Promise<Console[]> {
    if (!supabase) return fsRepository.getConsoles();
    const { data, error } = await supabase.from('consoles').select('*').order('display_order', { ascending: true });
    if (error || !data) return fsRepository.getConsoles();
    return data as Console[];
  },

  async addConsole(): Promise<Console> {
    if (!supabase) return fsRepository.addConsole();
    const consoles = await this.getConsoles();
    const nextNum = getNextTvNumber(consoles);
    const name = `TV ${nextNum}`;

    const { data, error } = await supabase.from('consoles').insert({
      name,
      status: 'AVAILABLE',
      display_order: consoles.length + 1,
      is_active: true
    }).select().single();

    if (error || !data) throw new Error(error?.message || 'Failed to add TV station');
    return data as Console;
  },

  async updateConsoleName(id: string, name: string): Promise<Console> {
    if (!supabase) return fsRepository.updateConsoleName(id, name);
    const { data, error } = await supabase.from('consoles').update({ name }).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return data as Console;
  },

  async toggleConsoleActive(id: string, isActive: boolean): Promise<Console> {
    if (!supabase) return fsRepository.toggleConsoleActive(id, isActive);
    const { data, error } = await supabase.from('consoles').update({ is_active: isActive }).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return data as Console;
  },

  async getActiveSessionByConsoleId(consoleId: string): Promise<Session | null> {
    if (!supabase) return fsRepository.getActiveSessionByConsoleId(consoleId);
    const { data, error } = await supabase
      .from('sessions')
      .select('id')
      .eq('console_id', consoleId)
      .eq('status', 'ACTIVE')
      .single();

    if (error || !data) return null;
    return this.getSessionById(data.id);
  },

  async getSessionById(sessionId: string): Promise<Session | null> {
    if (!supabase) return fsRepository.getSessionById(sessionId);
    const { data: session, error } = await supabase.from('sessions').select('*').eq('id', sessionId).single();
    if (error || !session) return null;

    const { data: consoleObj } = await supabase.from('consoles').select('name').eq('id', session.console_id).single();
    const { data: matches } = await supabase.from('matches').select('*').eq('session_id', sessionId).order('match_number', { ascending: true });
    const { data: payments } = await supabase.from('payments').select('*').eq('session_id', sessionId);
    const { data: adjustments } = await supabase.from('adjustments').select('*').eq('session_id', sessionId).order('created_at', { ascending: true });

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

  async startSession(consoleId: string, createdBy = 'Staff'): Promise<Session> {
    if (!supabase) return fsRepository.startSession(consoleId, createdBy);

    const { data: existing } = await supabase.from('sessions').select('id').eq('console_id', consoleId).eq('status', 'ACTIVE').single();
    if (existing) throw new Error('TV already has an active session');

    const { data: session, error } = await supabase
      .from('sessions')
      .insert({
        console_id: consoleId,
        game_type: 'FIFA',
        billing_type: 'MATCH_BASED',
        status: 'ACTIVE',
        total_amount: 0.00,
        payment_status: 'UNPAID',
        created_by: createdBy,
      })
      .select()
      .single();

    if (error || !session) throw new Error(error?.message || 'Failed to start session');

    await supabase.from('consoles').update({ status: 'PLAYING' }).eq('id', consoleId);

    const fullSession = await this.getSessionById(session.id);
    if (!fullSession) throw new Error('Session retrieval failed');
    return fullSession;
  },

  async addMatch(sessionId: string, idempotencyKey?: string): Promise<{ match: Match; sessionTotal: number }> {
    if (!supabase) return fsRepository.addMatch(sessionId, idempotencyKey);

    const session = await this.getSessionById(sessionId);
    if (!session || session.status !== 'ACTIVE') throw new Error('Session is not active');

    if (idempotencyKey) {
      const { data: existing } = await supabase
        .from('matches')
        .select('*')
        .eq('session_id', sessionId)
        .eq('client_idempotency_key', idempotencyKey)
        .single();
      if (existing) {
        return { match: existing as Match, sessionTotal: session.total_amount };
      }
    }

    const settings = await this.getSettings();
    const nextMatchNum = (session.matches?.length || 0) + 1;
    const basePrice = settings.fifa_normal_price;

    const { data: createdMatch, error } = await supabase
      .from('matches')
      .insert({
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
    await supabase.from('sessions').update({ total_amount: newTotal }).eq('id', sessionId);

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
    if (!supabase) return fsRepository.toggleMatchExtraTime(sessionId, matchId);

    const session = await this.getSessionById(sessionId);
    if (!session || session.status !== 'ACTIVE') throw new Error('Session is not active');

    const match = session.matches?.find((m) => m.id === matchId);
    if (!match) throw new Error('Match not found');

    const settings = await this.getSettings();
    const isAdding = !match.extra_time;
    const extraPrice = isAdding ? settings.fifa_extra_time_price : 0.00;
    const totalPrice = match.base_price + extraPrice;

    const { data: updated, error } = await supabase
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

    await supabase.from('sessions').update({ total_amount: newTotal }).eq('id', sessionId);

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
    if (!supabase) return fsRepository.undoLastMatch(sessionId);

    const session = await this.getSessionById(sessionId);
    if (!session || session.status !== 'ACTIVE') throw new Error('Session is not active');

    if (!session.matches || session.matches.length === 0) {
      return { sessionTotal: 0 };
    }

    const lastMatch = session.matches[session.matches.length - 1];
    await supabase.from('matches').delete().eq('id', lastMatch.id);

    const updatedSession = await this.getSessionById(sessionId);
    const matchesSum = updatedSession?.matches?.reduce((acc, m) => acc + Number(m.total_price), 0) || 0;
    await supabase.from('sessions').update({ total_amount: matchesSum }).eq('id', sessionId);

    return { sessionTotal: matchesSum };
  },

  async finishSession(sessionId: string, paymentMethod: 'CASH' | 'TELEBIRR' | 'CBE', reference?: string): Promise<Session> {
    if (!supabase) return fsRepository.finishSession(sessionId, paymentMethod, reference);

    const session = await this.getSessionById(sessionId);
    if (!session || session.status !== 'ACTIVE') throw new Error('Session is already finished');

    const finalTotal = session.total_amount;
    const now = new Date().toISOString();

    await supabase.from('payments').insert({
      session_id: sessionId,
      method: paymentMethod,
      amount: finalTotal,
      reference: reference || null,
    });

    await supabase
      .from('sessions')
      .update({
        status: 'FINISHED',
        payment_status: 'PAID',
        finished_at: now,
      })
      .eq('id', sessionId);

    await supabase.from('consoles').update({ status: 'AVAILABLE' }).eq('id', session.console_id);

    const finished = await this.getSessionById(sessionId);
    if (!finished) throw new Error('Failed to retrieve finished session');
    return finished;
  },

  async createAdjustment(sessionId: string, adjustmentAmount: number, reason: string, createdBy = 'Manager'): Promise<Adjustment> {
    if (!supabase) return fsRepository.createAdjustment(sessionId, adjustmentAmount, reason, createdBy);

    const session = await this.getSessionById(sessionId);
    if (!session) throw new Error('Session not found');

    const originalAmount = session.total_amount;
    const resultingAmount = originalAmount + adjustmentAmount;

    const { data: adj, error } = await supabase
      .from('adjustments')
      .insert({
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

    await supabase.from('sessions').update({ total_amount: resultingAmount }).eq('id', sessionId);

    if (session.status === 'FINISHED') {
      await supabase.from('payments').update({ amount: resultingAmount }).eq('session_id', sessionId);
    }

    return {
      ...adj,
      original_amount: Number(adj.original_amount),
      adjustment_amount: Number(adj.adjustment_amount),
      resulting_amount: Number(adj.resulting_amount),
    };
  },

  async getSessionsHistory(limit = 100): Promise<Session[]> {
    if (!supabase) return fsRepository.getSessionsHistory(limit);
    const { data } = await supabase.from('sessions').select('id').order('created_at', { ascending: false }).limit(limit);
    if (!data) return [];

    const result: Session[] = [];
    for (const item of data) {
      const sess = await this.getSessionById(item.id);
      if (sess) result.push(sess);
    }
    return result;
  },

  async getAnalyticsSummary(): Promise<AnalyticsSummary> {
    if (!supabase) return fsRepository.getAnalyticsSummary();
    const sessions = await this.getSessionsHistory(1000);
    const finishedSessions = sessions.filter((s) => s.status === 'FINISHED');

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
    if (!supabase) return fsRepository.getUsers();
    const { data } = await supabase.from('users').select('id, username, display_name, role, created_at');
    return (data || []) as User[];
  },

  async getUserByUsername(username: string): Promise<User | null> {
    if (!supabase) return fsRepository.getUserByUsername(username);
    const { data } = await supabase.from('users').select('*').eq('username', username).single();
    return data as User | null;
  },
};

export const repository: Repository = isSupabaseConfigured ? supabaseRepository : fsRepository;

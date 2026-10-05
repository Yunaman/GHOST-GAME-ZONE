import { isSupabaseConfigured, supabase } from '@/lib/db/supabase';
import { sqliteDb } from '@/lib/db/sqlite';
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
  updateConsoleName(id: string, name: string): Promise<Console>;
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

// Helper to recalculate SQLite session totals safely
function syncSqliteSessionTotal(sessionId: string): number {
  const matches = sqliteDb.prepare('SELECT total_price FROM matches WHERE session_id = ?').all(sessionId) as { total_price: number }[];
  const adjustments = sqliteDb.prepare('SELECT adjustment_amount FROM adjustments WHERE session_id = ?').all(sessionId) as { adjustment_amount: number }[];

  const matchesSum = matches.reduce((acc, m) => acc + m.total_price, 0);
  const adjustmentsSum = adjustments.reduce((acc, a) => acc + a.adjustment_amount, 0);
  const total = matchesSum + adjustmentsSum;

  sqliteDb.prepare('UPDATE sessions SET total_amount = ? WHERE id = ?').run(total, sessionId);
  return total;
}

// --- SQLite Implementation ---
const sqliteRepository: Repository = {
  async getSettings(): Promise<Settings> {
    const row = sqliteDb.prepare('SELECT * FROM settings WHERE id = ?').get('default') as Settings;
    if (!row) {
      const now = new Date().toISOString();
      sqliteDb.prepare('INSERT INTO settings (id, fifa_normal_price, fifa_extra_time_price, currency, updated_at) VALUES (\'default\', 15, 5, \'ETB\', ?)').run(now);
      return { id: 'default', fifa_normal_price: 15, fifa_extra_time_price: 5, currency: 'ETB', updated_at: now };
    }
    return row;
  },

  async updateSettings(fifa_normal_price: number, fifa_extra_time_price: number, currency: string): Promise<Settings> {
    const now = new Date().toISOString();
    sqliteDb.prepare(`
      UPDATE settings
      SET fifa_normal_price = ?, fifa_extra_time_price = ?, currency = ?, updated_at = ?
      WHERE id = 'default'
    `).run(fifa_normal_price, fifa_extra_time_price, currency, now);
    return this.getSettings();
  },

  async getConsoles(): Promise<Console[]> {
    return sqliteDb.prepare('SELECT * FROM consoles ORDER BY display_order ASC').all() as Console[];
  },

  async updateConsoleName(id: string, name: string): Promise<Console> {
    sqliteDb.prepare('UPDATE consoles SET name = ? WHERE id = ?').run(name, id);
    return sqliteDb.prepare('SELECT * FROM consoles WHERE id = ?').get(id) as Console;
  },

  async getActiveSessionByConsoleId(consoleId: string): Promise<Session | null> {
    const sessionRow = sqliteDb.prepare('SELECT * FROM sessions WHERE console_id = ? AND status = \'ACTIVE\'').get(consoleId) as Session | undefined;
    if (!sessionRow) return null;

    return this.getSessionById(sessionRow.id);
  },

  async getSessionById(sessionId: string): Promise<Session | null> {
    const session = sqliteDb.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as Session | undefined;
    if (!session) return null;

    const consoleObj = sqliteDb.prepare('SELECT name FROM consoles WHERE id = ?').get(session.console_id) as { name: string } | undefined;
    const matches = sqliteDb.prepare('SELECT * FROM matches WHERE session_id = ? ORDER BY match_number ASC').all(sessionId) as Match[];

    // Map SQLite integer boolean to JS boolean for extra_time
    const formattedMatches = matches.map(m => ({
      ...m,
      extra_time: Boolean(m.extra_time)
    }));

    const payments = sqliteDb.prepare('SELECT * FROM payments WHERE session_id = ?').all(sessionId) as Payment[];
    const adjustments = sqliteDb.prepare('SELECT * FROM adjustments WHERE session_id = ? ORDER BY created_at ASC').all(sessionId) as Adjustment[];

    return {
      ...session,
      console_name: consoleObj?.name || 'TV',
      matches: formattedMatches,
      payments,
      adjustments
    };
  },

  async startSession(consoleId: string, createdBy = 'Staff'): Promise<Session> {
    // Ensure TV exists
    const consoleObj = sqliteDb.prepare('SELECT * FROM consoles WHERE id = ?').get(consoleId) as Console;
    if (!consoleObj) throw new Error('Console TV not found');

    // Ensure no active session exists on this TV
    const active = sqliteDb.prepare('SELECT id FROM sessions WHERE console_id = ? AND status = \'ACTIVE\'').get(consoleId);
    if (active) throw new Error('TV already has an active session');

    const sessionId = cryptoRandomUUID();
    const now = new Date().toISOString();

    const insertStmt = sqliteDb.prepare(`
      INSERT INTO sessions (id, console_id, game_type, billing_type, status, started_at, total_amount, payment_status, created_by, created_at)
      VALUES (?, ?, 'FIFA', 'MATCH_BASED', 'ACTIVE', ?, 0.00, 'UNPAID', ?, ?)
    `);

    const updateConsoleStmt = sqliteDb.prepare(`
      UPDATE consoles SET status = 'PLAYING' WHERE id = ?
    `);

    sqliteDb.transaction(() => {
      insertStmt.run(sessionId, consoleId, now, createdBy, now);
      updateConsoleStmt.run(consoleId);
    })();

    const created = await this.getSessionById(sessionId);
    if (!created) throw new Error('Failed to retrieve created session');
    return created;
  },

  async addMatch(sessionId: string, idempotencyKey?: string): Promise<{ match: Match; sessionTotal: number }> {
    const session = sqliteDb.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as Session | undefined;
    if (!session || session.status !== 'ACTIVE') {
      throw new Error('Session is not active');
    }

    // Check idempotency if key provided
    if (idempotencyKey) {
      const existing = sqliteDb.prepare('SELECT * FROM matches WHERE session_id = ? AND client_idempotency_key = ?').get(sessionId, idempotencyKey) as Match | undefined;
      if (existing) {
        const currentTotal = syncSqliteSessionTotal(sessionId);
        return { match: { ...existing, extra_time: Boolean(existing.extra_time) }, sessionTotal: currentTotal };
      }
    }

    const settings = await this.getSettings();
    const existingMatches = sqliteDb.prepare('SELECT match_number FROM matches WHERE session_id = ? ORDER BY match_number DESC').all(sessionId) as { match_number: number }[];
    const nextMatchNum = existingMatches.length > 0 ? existingMatches[0].match_number + 1 : 1;

    const matchId = cryptoRandomUUID();
    const now = new Date().toISOString();
    const basePrice = settings.fifa_normal_price;

    sqliteDb.prepare(`
      INSERT INTO matches (id, session_id, match_number, base_price, extra_time, extra_time_price, total_price, client_idempotency_key, created_at)
      VALUES (?, ?, ?, ?, 0, 0.00, ?, ?, ?)
    `).run(matchId, sessionId, nextMatchNum, basePrice, basePrice, idempotencyKey || null, now);

    const sessionTotal = syncSqliteSessionTotal(sessionId);
    const createdMatch = sqliteDb.prepare('SELECT * FROM matches WHERE id = ?').get(matchId) as Match;

    return {
      match: { ...createdMatch, extra_time: Boolean(createdMatch.extra_time) },
      sessionTotal
    };
  },

  async toggleMatchExtraTime(sessionId: string, matchId: string): Promise<{ match: Match; sessionTotal: number }> {
    const session = sqliteDb.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as Session | undefined;
    if (!session || session.status !== 'ACTIVE') {
      throw new Error('Session is not active');
    }

    const match = sqliteDb.prepare('SELECT * FROM matches WHERE id = ? AND session_id = ?').get(matchId, sessionId) as Match | undefined;
    if (!match) throw new Error('Match not found');

    const settings = await this.getSettings();

    if (match.extra_time) {
      // Revert extra time
      const newTotalPrice = match.base_price;
      sqliteDb.prepare(`
        UPDATE matches SET extra_time = 0, extra_time_price = 0.00, total_price = ? WHERE id = ?
      `).run(newTotalPrice, matchId);
    } else {
      // Add extra time
      const extraPrice = settings.fifa_extra_time_price;
      const newTotalPrice = match.base_price + extraPrice;
      sqliteDb.prepare(`
        UPDATE matches SET extra_time = 1, extra_time_price = ?, total_price = ? WHERE id = ?
      `).run(extraPrice, newTotalPrice, matchId);
    }

    const sessionTotal = syncSqliteSessionTotal(sessionId);
    const updatedMatch = sqliteDb.prepare('SELECT * FROM matches WHERE id = ?').get(matchId) as Match;

    return {
      match: { ...updatedMatch, extra_time: Boolean(updatedMatch.extra_time) },
      sessionTotal
    };
  },

  async undoLastMatch(sessionId: string): Promise<{ sessionTotal: number }> {
    const session = sqliteDb.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as Session | undefined;
    if (!session || session.status !== 'ACTIVE') {
      throw new Error('Session is not active');
    }

    const lastMatch = sqliteDb.prepare('SELECT id FROM matches WHERE session_id = ? ORDER BY match_number DESC LIMIT 1').get(sessionId) as { id: string } | undefined;
    if (!lastMatch) {
      return { sessionTotal: 0 };
    }

    sqliteDb.prepare('DELETE FROM matches WHERE id = ?').run(lastMatch.id);
    const sessionTotal = syncSqliteSessionTotal(sessionId);

    return { sessionTotal };
  },

  async finishSession(sessionId: string, paymentMethod: 'CASH' | 'TELEBIRR' | 'CBE', reference?: string): Promise<Session> {
    const session = sqliteDb.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as Session | undefined;
    if (!session) throw new Error('Session not found');
    if (session.status !== 'ACTIVE') throw new Error('Session is already finished or cancelled');

    const finalTotal = syncSqliteSessionTotal(sessionId);
    const now = new Date().toISOString();
    const paymentId = cryptoRandomUUID();

    sqliteDb.transaction(() => {
      sqliteDb.prepare(`
        INSERT INTO payments (id, session_id, method, amount, reference, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(paymentId, sessionId, paymentMethod, finalTotal, reference || null, now);

      sqliteDb.prepare(`
        UPDATE sessions
        SET status = 'FINISHED', payment_status = 'PAID', finished_at = ?, total_amount = ?
        WHERE id = ?
      `).run(now, finalTotal, sessionId);

      sqliteDb.prepare(`
        UPDATE consoles SET status = 'AVAILABLE' WHERE id = ?
      `).run(session.console_id);
    })();

    const finished = await this.getSessionById(sessionId);
    if (!finished) throw new Error('Failed to fetch finished session');
    return finished;
  },

  async createAdjustment(sessionId: string, adjustmentAmount: number, reason: string, createdBy = 'Manager'): Promise<Adjustment> {
    const session = sqliteDb.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as Session | undefined;
    if (!session) throw new Error('Session not found');

    const id = cryptoRandomUUID();
    const now = new Date().toISOString();
    const originalAmount = session.total_amount;
    const resultingAmount = originalAmount + adjustmentAmount;

    sqliteDb.transaction(() => {
      sqliteDb.prepare(`
        INSERT INTO adjustments (id, session_id, original_amount, adjustment_amount, resulting_amount, reason, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, sessionId, originalAmount, adjustmentAmount, resultingAmount, reason, createdBy, now);

      syncSqliteSessionTotal(sessionId);

      if (session.status === 'FINISHED') {
        sqliteDb.prepare('UPDATE payments SET amount = ? WHERE session_id = ?').run(resultingAmount, sessionId);
      }
    })();

    return sqliteDb.prepare('SELECT * FROM adjustments WHERE id = ?').get(id) as Adjustment;
  },

  async getSessionsHistory(limit = 100): Promise<Session[]> {
    const rows = sqliteDb.prepare('SELECT id FROM sessions ORDER BY created_at DESC LIMIT ?').all(limit) as { id: string }[];
    const result: Session[] = [];
    for (const r of rows) {
      const sess = await this.getSessionById(r.id);
      if (sess) result.push(sess);
    }
    return result;
  },

  async getAnalyticsSummary(): Promise<AnalyticsSummary> {
    const sessions = await this.getSessionsHistory(1000);
    const finishedSessions = sessions.filter(s => s.status === 'FINISHED');

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
        const extraCount = sess.matches?.filter(m => m.extra_time).length || 0;
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
    return sqliteDb.prepare('SELECT id, username, display_name, role, created_at FROM users').all() as User[];
  },

  async getUserByUsername(username: string): Promise<User | null> {
    const user = sqliteDb.prepare('SELECT * FROM users WHERE username = ?').get(username) as User | undefined;
    return user || null;
  }
};

// --- Supabase Implementation ---
const supabaseRepository: Repository = {
  async getSettings(): Promise<Settings> {
    if (!supabase) return sqliteRepository.getSettings();
    const { data, error } = await supabase.from('settings').select('*').eq('id', 'default').single();
    if (error || !data) return sqliteRepository.getSettings();
    return {
      id: data.id,
      fifa_normal_price: Number(data.fifa_normal_price),
      fifa_extra_time_price: Number(data.fifa_extra_time_price),
      currency: data.currency,
      updated_at: data.updated_at
    };
  },

  async updateSettings(fifa_normal_price: number, fifa_extra_time_price: number, currency: string): Promise<Settings> {
    if (!supabase) return sqliteRepository.updateSettings(fifa_normal_price, fifa_extra_time_price, currency);
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
      updated_at: data.updated_at
    };
  },

  async getConsoles(): Promise<Console[]> {
    if (!supabase) return sqliteRepository.getConsoles();
    const { data, error } = await supabase.from('consoles').select('*').order('display_order', { ascending: true });
    if (error || !data) return sqliteRepository.getConsoles();
    return data as Console[];
  },

  async updateConsoleName(id: string, name: string): Promise<Console> {
    if (!supabase) return sqliteRepository.updateConsoleName(id, name);
    const { data, error } = await supabase.from('consoles').update({ name }).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return data as Console;
  },

  async getActiveSessionByConsoleId(consoleId: string): Promise<Session | null> {
    if (!supabase) return sqliteRepository.getActiveSessionByConsoleId(consoleId);
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
    if (!supabase) return sqliteRepository.getSessionById(sessionId);
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
      matches: (matches || []).map(m => ({
        ...m,
        base_price: Number(m.base_price),
        extra_time_price: Number(m.extra_time_price),
        total_price: Number(m.total_price),
      })),
      payments: (payments || []).map(p => ({ ...p, amount: Number(p.amount) })),
      adjustments: (adjustments || []).map(a => ({
        ...a,
        original_amount: Number(a.original_amount),
        adjustment_amount: Number(a.adjustment_amount),
        resulting_amount: Number(a.resulting_amount),
      }))
    };
  },

  async startSession(consoleId: string, createdBy = 'Staff'): Promise<Session> {
    if (!supabase) return sqliteRepository.startSession(consoleId, createdBy);

    // Check active
    const { data: existing } = await supabase.from('sessions').select('id').eq('console_id', consoleId).eq('status', 'ACTIVE').single();
    if (existing) throw new Error('TV already has an active session');

    const { data: session, error } = await supabase.from('sessions').insert({
      console_id: consoleId,
      game_type: 'FIFA',
      billing_type: 'MATCH_BASED',
      status: 'ACTIVE',
      total_amount: 0.00,
      payment_status: 'UNPAID',
      created_by: createdBy
    }).select().single();

    if (error || !session) throw new Error(error?.message || 'Failed to start session');

    await supabase.from('consoles').update({ status: 'PLAYING' }).eq('id', consoleId);

    const fullSession = await this.getSessionById(session.id);
    if (!fullSession) throw new Error('Session retrieval failed');
    return fullSession;
  },

  async addMatch(sessionId: string, idempotencyKey?: string): Promise<{ match: Match; sessionTotal: number }> {
    if (!supabase) return sqliteRepository.addMatch(sessionId, idempotencyKey);

    const session = await this.getSessionById(sessionId);
    if (!session || session.status !== 'ACTIVE') throw new Error('Session is not active');

    if (idempotencyKey) {
      const { data: existing } = await supabase.from('matches').select('*').eq('session_id', sessionId).eq('client_idempotency_key', idempotencyKey).single();
      if (existing) {
        return { match: existing as Match, sessionTotal: session.total_amount };
      }
    }

    const settings = await this.getSettings();
    const nextMatchNum = (session.matches?.length || 0) + 1;
    const basePrice = settings.fifa_normal_price;

    const { data: createdMatch, error } = await supabase.from('matches').insert({
      session_id: sessionId,
      match_number: nextMatchNum,
      base_price: basePrice,
      extra_time: false,
      extra_time_price: 0.00,
      total_price: basePrice,
      client_idempotency_key: idempotencyKey || null
    }).select().single();

    if (error || !createdMatch) throw new Error(error?.message || 'Failed to create match');

    // Sync total
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
      sessionTotal: newTotal
    };
  },

  async toggleMatchExtraTime(sessionId: string, matchId: string): Promise<{ match: Match; sessionTotal: number }> {
    if (!supabase) return sqliteRepository.toggleMatchExtraTime(sessionId, matchId);

    const session = await this.getSessionById(sessionId);
    if (!session || session.status !== 'ACTIVE') throw new Error('Session is not active');

    const match = session.matches?.find(m => m.id === matchId);
    if (!match) throw new Error('Match not found');

    const settings = await this.getSettings();
    const isAdding = !match.extra_time;
    const extraPrice = isAdding ? settings.fifa_extra_time_price : 0.00;
    const totalPrice = match.base_price + extraPrice;

    const { data: updated, error } = await supabase.from('matches').update({
      extra_time: isAdding,
      extra_time_price: extraPrice,
      total_price: totalPrice
    }).eq('id', matchId).select().single();

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
      sessionTotal: newTotal
    };
  },

  async undoLastMatch(sessionId: string): Promise<{ sessionTotal: number }> {
    if (!supabase) return sqliteRepository.undoLastMatch(sessionId);

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
    if (!supabase) return sqliteRepository.finishSession(sessionId, paymentMethod, reference);

    const session = await this.getSessionById(sessionId);
    if (!session || session.status !== 'ACTIVE') throw new Error('Session is already finished');

    const finalTotal = session.total_amount;
    const now = new Date().toISOString();

    await supabase.from('payments').insert({
      session_id: sessionId,
      method: paymentMethod,
      amount: finalTotal,
      reference: reference || null
    });

    await supabase.from('sessions').update({
      status: 'FINISHED',
      payment_status: 'PAID',
      finished_at: now
    }).eq('id', sessionId);

    await supabase.from('consoles').update({ status: 'AVAILABLE' }).eq('id', session.console_id);

    const finished = await this.getSessionById(sessionId);
    if (!finished) throw new Error('Failed to retrieve finished session');
    return finished;
  },

  async createAdjustment(sessionId: string, adjustmentAmount: number, reason: string, createdBy = 'Manager'): Promise<Adjustment> {
    if (!supabase) return sqliteRepository.createAdjustment(sessionId, adjustmentAmount, reason, createdBy);

    const session = await this.getSessionById(sessionId);
    if (!session) throw new Error('Session not found');

    const originalAmount = session.total_amount;
    const resultingAmount = originalAmount + adjustmentAmount;

    const { data: adj, error } = await supabase.from('adjustments').insert({
      session_id: sessionId,
      original_amount: originalAmount,
      adjustment_amount: adjustmentAmount,
      resulting_amount: resultingAmount,
      reason,
      created_by: createdBy
    }).select().single();

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
    if (!supabase) return sqliteRepository.getSessionsHistory(limit);
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
    if (!supabase) return sqliteRepository.getAnalyticsSummary();
    const sessions = await this.getSessionsHistory(1000);
    const finishedSessions = sessions.filter(s => s.status === 'FINISHED');

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
        const extraCount = sess.matches?.filter(m => m.extra_time).length || 0;
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
    if (!supabase) return sqliteRepository.getUsers();
    const { data } = await supabase.from('users').select('id, username, display_name, role, created_at');
    return (data || []) as User[];
  },

  async getUserByUsername(username: string): Promise<User | null> {
    if (!supabase) return sqliteRepository.getUserByUsername(username);
    const { data } = await supabase.from('users').select('*').eq('username', username).single();
    return data as User | null;
  }
};

// Select repository dynamically based on environment
export const repository: Repository = isSupabaseConfigured ? supabaseRepository : sqliteRepository;

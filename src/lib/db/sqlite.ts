import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'ghost_game_zone.db');

export const sqliteDb = new Database(dbPath);

// Enable WAL mode for concurrent performance
sqliteDb.pragma('journal_mode = WAL');

// Initialize schema
sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL,
    pin_code TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS consoles (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'AVAILABLE',
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    fifa_normal_price REAL NOT NULL DEFAULT 15.00,
    fifa_extra_time_price REAL NOT NULL DEFAULT 5.00,
    currency TEXT NOT NULL DEFAULT 'ETB',
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    console_id TEXT NOT NULL,
    game_type TEXT NOT NULL DEFAULT 'FIFA',
    billing_type TEXT NOT NULL DEFAULT 'MATCH_BASED',
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    started_at TEXT NOT NULL,
    finished_at TEXT,
    total_amount REAL NOT NULL DEFAULT 0.00,
    payment_status TEXT NOT NULL DEFAULT 'UNPAID',
    created_by TEXT DEFAULT 'Staff',
    created_at TEXT NOT NULL,
    FOREIGN KEY(console_id) REFERENCES consoles(id)
  );

  CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    match_number INTEGER NOT NULL,
    base_price REAL NOT NULL DEFAULT 15.00,
    extra_time INTEGER NOT NULL DEFAULT 0,
    extra_time_price REAL NOT NULL DEFAULT 0.00,
    total_price REAL NOT NULL DEFAULT 15.00,
    client_idempotency_key TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    UNIQUE(session_id, match_number)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    method TEXT NOT NULL,
    amount REAL NOT NULL,
    reference TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS adjustments (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    original_amount REAL NOT NULL,
    adjustment_amount REAL NOT NULL,
    resulting_amount REAL NOT NULL,
    reason TEXT NOT NULL,
    created_by TEXT DEFAULT 'Manager',
    created_at TEXT NOT NULL,
    FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );
`);

// Seed initial data if missing
const settingsCount = sqliteDb.prepare('SELECT COUNT(*) as count FROM settings').get() as { count: number };
if (settingsCount.count === 0) {
  sqliteDb.prepare(`
    INSERT INTO settings (id, fifa_normal_price, fifa_extra_time_price, currency, updated_at)
    VALUES ('default', 15.00, 5.00, 'ETB', ?)
  `).run(new Date().toISOString());
}

const consolesCount = sqliteDb.prepare('SELECT COUNT(*) as count FROM consoles').get() as { count: number };
if (consolesCount.count === 0) {
  const insertConsole = sqliteDb.prepare(`
    INSERT INTO consoles (id, name, status, display_order, created_at)
    VALUES (?, ?, 'AVAILABLE', ?, ?)
  `);
  const now = new Date().toISOString();
  insertConsole.run('c-1', 'TV 1', 1, now);
  insertConsole.run('c-2', 'TV 2', 2, now);
  insertConsole.run('c-3', 'TV 3', 3, now);
}

const usersCount = sqliteDb.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
if (usersCount.count === 0) {
  const insertUser = sqliteDb.prepare(`
    INSERT INTO users (id, username, display_name, role, pin_code, created_at)
    VALUES (?, ?, ?, ?, '1234', ?)
  `);
  const now = new Date().toISOString();
  insertUser.run('u-1', 'owner', 'Owner', 'OWNER', now);
  insertUser.run('u-2', 'manager', 'Manager', 'MANAGER', now);
  insertUser.run('u-3', 'staff', 'Staff', 'STAFF', now);
}

import fs from 'fs';
import path from 'path';
import {
  Console,
  Session,
  Match,
  Payment,
  Adjustment,
  Settings,
  User,
} from '@/types';

const dataDir = path.join(process.cwd(), 'data');

function ensureDataDir(): void {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    // In production / Vercel serverless environment, local filesystem writing is disallowed.
    return;
  }
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

const dbFilePath = path.join(dataDir, 'ghost_game_zone_db.json');

export interface DatabaseSchema {
  users: User[];
  consoles: Console[];
  settings: Settings;
  sessions: Session[];
  matches: Match[];
  payments: Payment[];
  adjustments: Adjustment[];
}

function getInitialData(): DatabaseSchema {
  const now = new Date().toISOString();
  return {
    users: [
      { id: 'u-1', username: 'owner', display_name: 'Owner', role: 'OWNER', pin_code: '1234', created_at: now },
      { id: 'u-2', username: 'manager', display_name: 'Manager', role: 'MANAGER', pin_code: '1234', created_at: now },
      { id: 'u-3', username: 'staff', display_name: 'Staff', role: 'STAFF', pin_code: '1234', created_at: now },
    ],
    consoles: [
      { id: 'c-1', name: 'TV 1', status: 'AVAILABLE', display_order: 1, created_at: now },
      { id: 'c-2', name: 'TV 2', status: 'AVAILABLE', display_order: 2, created_at: now },
      { id: 'c-3', name: 'TV 3', status: 'AVAILABLE', display_order: 3, created_at: now },
    ],
    settings: {
      id: 'default',
      fifa_normal_price: 15.00,
      fifa_extra_time_price: 5.00,
      currency: 'ETB',
      updated_at: now,
    },
    sessions: [],
    matches: [],
    payments: [],
    adjustments: [],
  };
}

export function loadDb(): DatabaseSchema {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    throw new Error('Local JSON filesystem database operations are disabled in production. Use Supabase.');
  }
  ensureDataDir();
  if (!fs.existsSync(dbFilePath)) {
    const initial = getInitialData();
    saveDb(initial);
    return initial;
  }
  try {
    const raw = fs.readFileSync(dbFilePath, 'utf-8');
    return JSON.parse(raw) as DatabaseSchema;
  } catch (err) {
    const initial = getInitialData();
    saveDb(initial);
    return initial;
  }
}

export function saveDb(data: DatabaseSchema): void {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    throw new Error('Local JSON filesystem database operations are disabled in production. Use Supabase.');
  }
  ensureDataDir();
  const tmpPath = `${dbFilePath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmpPath, dbFilePath);
}

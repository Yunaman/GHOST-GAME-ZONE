export type Role = 'OWNER' | 'MANAGER' | 'STAFF';

export type ConsoleStatus = 'AVAILABLE' | 'PLAYING' | 'FINISHED';

export type GameType = 'FIFA' | 'GTA';

export type BillingType = 'MATCH_BASED' | 'TIME_BASED';

export type SessionStatus = 'ACTIVE' | 'FINISHED' | 'CANCELLED';

export type PaymentStatus = 'UNPAID' | 'PAID';

export type PaymentMethod = 'CASH' | 'TELEBIRR' | 'CBE';

export interface User {
  id: string;
  username: string;
  display_name: string;
  role: Role;
  pin_code?: string;
  created_at: string;
}

export interface Console {
  id: string;
  name: string;
  status: ConsoleStatus;
  display_order: number;
  is_active?: boolean;
  created_at: string;
}

export interface Settings {
  id: string;
  fifa_normal_price: number;
  fifa_extra_time_price: number;
  currency: string;
  updated_at: string;
}

export interface Match {
  id: string;
  session_id: string;
  match_number: number;
  base_price: number;
  extra_time: boolean;
  extra_time_price: number;
  total_price: number;
  client_idempotency_key?: string;
  created_at: string;
}

export interface Payment {
  id: string;
  session_id: string;
  method: PaymentMethod;
  amount: number;
  reference?: string;
  created_at: string;
}

export interface Adjustment {
  id: string;
  session_id: string;
  original_amount: number;
  adjustment_amount: number;
  resulting_amount: number;
  reason: string;
  created_by: string;
  created_at: string;
}

export interface Session {
  id: string;
  console_id: string;
  game_type: GameType;
  billing_type: BillingType;
  status: SessionStatus;
  started_at: string;
  finished_at?: string;
  total_amount: number;
  payment_status: PaymentStatus;
  created_by: string;
  created_at: string;
  console_name?: string;
  matches?: Match[];
  payments?: Payment[];
  adjustments?: Adjustment[];
}

export interface ActiveConsoleState {
  console: Console;
  active_session?: Session;
}

export interface AnalyticsSummary {
  revenue: {
    today: number;
    week: number;
    month: number;
    allTime: number;
  };
  counts: {
    todaySessions: number;
    todayMatches: number;
    todayExtraTimes: number;
  };
  revenueByPaymentMethod: {
    CASH: number;
    TELEBIRR: number;
    CBE: number;
  };
  revenueByConsole: Record<string, number>;
}

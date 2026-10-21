export type Role = 'OWNER' | 'MANAGER' | 'STAFF' | 'CUSTOMER';

export type ConsoleStatus = 'AVAILABLE' | 'PLAYING' | 'FINISHED';

export type GameType = 'FIFA' | 'GTA';

export type BillingType = 'MATCH_BASED' | 'TIME_BASED';

export type SessionStatus = 'ACTIVE' | 'FINISHED' | 'CANCELLED';

export type PaymentStatus = 'UNPAID' | 'PAID' | 'PENDING';

export type PaymentMethod = 'CASH' | 'TELEBIRR' | 'CBE';

export type AccountStatus = 'ACTIVE' | 'SUSPENDED';

export interface Tenant {
  id: string;
  name: string;
  owner_name: string;
  username: string;
  license_price: number;
  payment_status: 'PAID' | 'PENDING';
  account_status: AccountStatus;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  tenant_id?: string;
  username: string;
  display_name: string;
  role: Role;
  pin_code?: string;
  created_at: string;
}

export interface Console {
  id: string;
  tenant_id?: string;
  name: string;
  status: ConsoleStatus;
  display_order: number;
  is_active?: boolean;
  created_at: string;
}

export interface Settings {
  id: string;
  tenant_id?: string;
  fifa_normal_price: number;
  fifa_extra_time_price: number;
  currency: string;
  history_cleared_at?: string;
  reports_reset_at?: string;
  updated_at: string;
}

export interface Match {
  id: string;
  tenant_id?: string;
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
  tenant_id?: string;
  session_id: string;
  method: PaymentMethod;
  amount: number;
  reference?: string;
  created_at: string;
}

export interface Adjustment {
  id: string;
  tenant_id?: string;
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
  tenant_id?: string;
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

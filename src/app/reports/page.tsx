import { repository } from '@/lib/repository';
import { formatCurrency } from '@/lib/utils';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Tv,
  CreditCard,
  Gamepad2,
  Zap,
  CalendarDays
} from 'lucide-react';

export const revalidate = 0;

export default async function ReportsPage() {
  const summary = await repository.getAnalyticsSummary();
  const settings = await repository.getSettings();
  const currency = settings.currency || 'ETB';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-[#161a23] p-4 rounded-xl border border-gray-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-mono font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-cyan-400" />
            <span>OWNER & MANAGER REPORTS</span>
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            Real-time financial performance and gaming center metrics
          </p>
        </div>
      </div>

      {/* Primary Revenue Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Today */}
        <div className="paper-card p-4 space-y-1 border-emerald-600/50">
          <div className="flex items-center justify-between text-gray-500 font-mono text-[10px] uppercase font-bold">
            <span>TODAY</span>
            <CalendarDays className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-700">
            {formatCurrency(summary.revenue.today, currency)}
          </div>
          <div className="text-[11px] font-mono text-gray-500">
            {summary.counts.todaySessions} sessions today
          </div>
        </div>

        {/* This Week */}
        <div className="paper-card p-4 space-y-1">
          <div className="flex items-center justify-between text-gray-500 font-mono text-[10px] uppercase font-bold">
            <span>THIS WEEK</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black font-mono text-blue-700">
            {formatCurrency(summary.revenue.week, currency)}
          </div>
          <div className="text-[11px] font-mono text-gray-500">Last 7 days</div>
        </div>

        {/* This Month */}
        <div className="paper-card p-4 space-y-1">
          <div className="flex items-center justify-between text-gray-500 font-mono text-[10px] uppercase font-bold">
            <span>THIS MONTH</span>
            <DollarSign className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black font-mono text-purple-700">
            {formatCurrency(summary.revenue.month, currency)}
          </div>
          <div className="text-[11px] font-mono text-gray-500">Current calendar month</div>
        </div>

        {/* All Time */}
        <div className="paper-card p-4 space-y-1">
          <div className="flex items-center justify-between text-gray-500 font-mono text-[10px] uppercase font-bold">
            <span>ALL TIME</span>
            <BarChart3 className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-700">
            {formatCurrency(summary.revenue.allTime, currency)}
          </div>
          <div className="text-[11px] font-mono text-gray-500">Total system revenue</div>
        </div>
      </div>

      {/* FIFA Match Breakdown Stats */}
      <div className="paper-card p-5 space-y-3">
        <h2 className="font-mono font-bold text-sm text-gray-900 uppercase flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-emerald-600" />
          <span>TODAY'S FIFA MATCH STATS</span>
        </h2>

        <div className="grid grid-cols-3 gap-3 font-mono text-center">
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-2xl font-black text-gray-900">{summary.counts.todayMatches}</div>
            <div className="text-[10px] text-gray-500 uppercase font-bold mt-1">Total FIFA Matches</div>
          </div>

          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <div className="text-2xl font-black text-amber-800 flex items-center justify-center gap-1">
              <Zap className="w-5 h-5 fill-amber-500 text-amber-500" />
              {summary.counts.todayExtraTimes}
            </div>
            <div className="text-[10px] text-amber-800 uppercase font-bold mt-1">Extra-Time Matches</div>
          </div>

          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-2xl font-black text-blue-900">{summary.counts.todaySessions}</div>
            <div className="text-[10px] text-blue-800 uppercase font-bold mt-1">Finished Sessions</div>
          </div>
        </div>
      </div>

      {/* Revenue Breakdown by TV & Payment Method */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* By TV */}
        <div className="paper-card p-5 space-y-3">
          <h2 className="font-mono font-bold text-sm text-gray-900 uppercase flex items-center gap-2">
            <Tv className="w-5 h-5 text-emerald-600" />
            <span>REVENUE BY TV STATION</span>
          </h2>

          <div className="space-y-2 font-mono text-xs">
            {Object.entries(summary.revenueByConsole).map(([tvName, amount]) => (
              <div
                key={tvName}
                className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between"
              >
                <span className="font-bold text-gray-800">{tvName}</span>
                <span className="font-black text-emerald-700">
                  {formatCurrency(amount, currency)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* By Payment Method */}
        <div className="paper-card p-5 space-y-3">
          <h2 className="font-mono font-bold text-sm text-gray-900 uppercase flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <span>REVENUE BY PAYMENT METHOD</span>
          </h2>

          <div className="space-y-2 font-mono text-xs">
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
              <span className="font-bold text-gray-800">CASH</span>
              <span className="font-black text-emerald-700">
                {formatCurrency(summary.revenueByPaymentMethod.CASH, currency)}
              </span>
            </div>

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
              <span className="font-bold text-gray-800">TELEBIRR</span>
              <span className="font-black text-blue-700">
                {formatCurrency(summary.revenueByPaymentMethod.TELEBIRR, currency)}
              </span>
            </div>

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
              <span className="font-bold text-gray-800">CBE BIRR</span>
              <span className="font-black text-purple-700">
                {formatCurrency(summary.revenueByPaymentMethod.CBE, currency)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

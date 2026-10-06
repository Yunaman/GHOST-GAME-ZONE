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
      <div className="flex items-center justify-between ghost-glass-card p-4 sm:p-5 border border-gray-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-gaming font-black text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-cyan-400" />
            <span>FINANCIAL REPORTS</span>
            <span className="text-xl">👻</span>
          </h1>
          <p className="font-handwriting text-emerald-400 text-lg sm:text-xl mt-0.5">
            Real-time revenue metrics and gaming floor analytics
          </p>
        </div>
      </div>

      {/* Primary Revenue Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Today */}
        <div className="ghost-glass-card p-4 space-y-1 border-emerald-500/40">
          <div className="flex items-center justify-between text-gray-400 font-gaming text-[10px] uppercase font-bold">
            <span>TODAY</span>
            <CalendarDays className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black font-gaming text-emerald-400">
            {formatCurrency(summary.revenue.today, currency)}
          </div>
          <div className="font-handwriting text-emerald-400 text-lg">
            {summary.counts.todaySessions} sessions today
          </div>
        </div>

        {/* This Week */}
        <div className="ghost-glass-card p-4 space-y-1 border-blue-500/40">
          <div className="flex items-center justify-between text-gray-400 font-gaming text-[10px] uppercase font-bold">
            <span>THIS WEEK</span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black font-gaming text-blue-400">
            {formatCurrency(summary.revenue.week, currency)}
          </div>
          <div className="font-handwriting text-blue-400 text-lg">Last 7 days</div>
        </div>

        {/* This Month */}
        <div className="ghost-glass-card p-4 space-y-1 border-purple-500/40">
          <div className="flex items-center justify-between text-gray-400 font-gaming text-[10px] uppercase font-bold">
            <span>THIS MONTH</span>
            <DollarSign className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black font-gaming text-purple-400">
            {formatCurrency(summary.revenue.month, currency)}
          </div>
          <div className="font-handwriting text-purple-400 text-lg">Current month</div>
        </div>

        {/* All Time */}
        <div className="ghost-glass-card p-4 space-y-1 border-amber-500/40">
          <div className="flex items-center justify-between text-gray-400 font-gaming text-[10px] uppercase font-bold">
            <span>ALL TIME</span>
            <BarChart3 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black font-gaming text-amber-400">
            {formatCurrency(summary.revenue.allTime, currency)}
          </div>
          <div className="font-handwriting text-amber-400 text-lg">Total revenue</div>
        </div>
      </div>

      {/* FIFA Match Breakdown Stats */}
      <div className="ghost-glass-card p-5 space-y-3">
        <h2 className="font-gaming font-bold text-sm text-white uppercase flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-emerald-400" />
          <span>TODAY'S FIFA MATCH STATS</span>
        </h2>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 bg-gray-900/80 rounded-xl border border-gray-800">
            <div className="text-2xl font-gaming font-black text-white">{summary.counts.todayMatches}</div>
            <div className="font-handwriting text-gray-400 text-lg">Total FIFA Matches</div>
          </div>

          <div className="p-3 bg-amber-950/40 rounded-xl border border-amber-800/60">
            <div className="text-2xl font-gaming font-black text-amber-300 flex items-center justify-center gap-1">
              <Zap className="w-5 h-5 fill-amber-400 text-amber-400" />
              {summary.counts.todayExtraTimes}
            </div>
            <div className="font-handwriting text-amber-400 text-lg">Extra-Time Matches</div>
          </div>

          <div className="p-3 bg-blue-950/40 rounded-xl border border-blue-800/60">
            <div className="text-2xl font-gaming font-black text-blue-300">{summary.counts.todaySessions}</div>
            <div className="font-handwriting text-blue-400 text-lg">Finished Sessions</div>
          </div>
        </div>
      </div>

      {/* Revenue Breakdown by TV & Payment Method */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* By TV */}
        <div className="ghost-glass-card p-5 space-y-3">
          <h2 className="font-gaming font-bold text-sm text-white uppercase flex items-center gap-2">
            <Tv className="w-5 h-5 text-emerald-400" />
            <span>REVENUE BY TV STATION</span>
          </h2>

          <div className="space-y-2 text-xs">
            {Object.entries(summary.revenueByConsole).map(([tvName, amount]) => (
              <div
                key={tvName}
                className="p-3 bg-gray-900/80 border border-gray-800 rounded-xl flex items-center justify-between"
              >
                <span className="font-gaming font-bold text-gray-200">{tvName}</span>
                <span className="font-gaming font-black text-emerald-400 text-sm">
                  {formatCurrency(amount, currency)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* By Payment Method */}
        <div className="ghost-glass-card p-5 space-y-3">
          <h2 className="font-gaming font-bold text-sm text-white uppercase flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-400" />
            <span>REVENUE BY PAYMENT METHOD</span>
          </h2>

          <div className="space-y-2 text-xs">
            <div className="p-3 bg-gray-900/80 border border-gray-800 rounded-xl flex items-center justify-between">
              <span className="font-gaming font-bold text-gray-200">CASH</span>
              <span className="font-gaming font-black text-emerald-400 text-sm">
                {formatCurrency(summary.revenueByPaymentMethod.CASH, currency)}
              </span>
            </div>

            <div className="p-3 bg-gray-900/80 border border-gray-800 rounded-xl flex items-center justify-between">
              <span className="font-gaming font-bold text-gray-200">TELEBIRR</span>
              <span className="font-gaming font-black text-blue-400 text-sm">
                {formatCurrency(summary.revenueByPaymentMethod.TELEBIRR, currency)}
              </span>
            </div>

            <div className="p-3 bg-gray-900/80 border border-gray-800 rounded-xl flex items-center justify-between">
              <span className="font-gaming font-bold text-gray-200">CBE BIRR</span>
              <span className="font-gaming font-black text-purple-400 text-sm">
                {formatCurrency(summary.revenueByPaymentMethod.CBE, currency)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

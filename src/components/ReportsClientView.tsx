'use client';

import { useState, useEffect } from 'react';
import { AnalyticsSummary, Settings } from '@/types';
import { offlineRepository } from '@/lib/repository/offline-repository';
import { formatCurrency } from '@/lib/utils';
import { BarChart3, TrendingUp, Calendar, Tv, CreditCard } from 'lucide-react';
import { GhostPaymentCard } from '@/components/GhostPaymentCard';
import { ResetReportsButton } from '@/components/ResetReportsButton';
import { useRouter } from 'next/navigation';

interface ReportsClientViewProps {
  initialSummary: AnalyticsSummary;
  initialSettings: Settings;
}

export function ReportsClientView({ initialSummary, initialSettings }: ReportsClientViewProps) {
  const router = useRouter();
  const [summary, setSummary] = useState<AnalyticsSummary>(initialSummary);
  const [settings, setSettings] = useState<Settings>(initialSettings);

  const currency = settings.currency || 'ETB';

  const loadData = async () => {
    try {
      const localSummary = await offlineRepository.getAnalyticsSummary();
      const localSettings = await offlineRepository.getSettings();
      if (localSummary) setSummary(localSummary);
      if (localSettings) setSettings(localSettings);
    } catch (err) {
      // Fallback
    }
  };

  useEffect(() => {
    setSummary(initialSummary);
    setSettings(initialSettings);
  }, [initialSummary, initialSettings]);

  useEffect(() => {
    loadData();

    const handleDataUpdate = () => {
      loadData();
      router.refresh();
    };

    window.addEventListener('ghost_data_updated', handleDataUpdate);
    return () => {
      window.removeEventListener('ghost_data_updated', handleDataUpdate);
    };
  }, [router]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ghost-glass-card p-4 sm:p-5 border border-purple-900/40">
        <div>
          <h1 className="text-xl sm:text-2xl font-gaming font-black text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-cyan-400" />
            <span>REVENUE & ANALYTICS</span>
            <span className="text-xl">👻</span>
          </h1>
          <p className="font-handwriting text-purple-300 text-lg sm:text-xl mt-0.5">
            Real-time financial performance and gaming center metrics
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ResetReportsButton />
        </div>
      </div>

      {/* Primary Revenue Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today */}
        <div className="ghost-glass-card p-5 border border-purple-800/60 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="font-gaming font-bold text-xs text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              TODAY REVENUE
            </span>
            <span className="text-xl">👻</span>
          </div>
          <div className="text-3xl font-gaming font-black text-white mt-3 drop-shadow-[0_0_12px_rgba(168,85,247,0.3)]">
            {formatCurrency(summary.revenue.today, currency)}
          </div>
          <div className="mt-2 text-xs font-handwriting text-purple-300">
            {summary.counts.todaySessions} sessions • {summary.counts.todayMatches} matches ({summary.counts.todayExtraTimes} extra)
          </div>
        </div>

        {/* This Week */}
        <div className="ghost-glass-card p-5 border border-purple-800/40">
          <div className="flex items-center justify-between">
            <span className="font-gaming font-bold text-xs text-purple-300 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-4 h-4 text-purple-400" />
              THIS WEEK
            </span>
          </div>
          <div className="text-2xl font-gaming font-black text-white mt-3">
            {formatCurrency(summary.revenue.week, currency)}
          </div>
          <div className="mt-2 text-xs font-handwriting text-purple-400">
            Last 7 days total
          </div>
        </div>

        {/* This Month */}
        <div className="ghost-glass-card p-5 border border-purple-800/40">
          <div className="flex items-center justify-between">
            <span className="font-gaming font-bold text-xs text-amber-300 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-4 h-4 text-amber-400" />
              THIS MONTH
            </span>
          </div>
          <div className="text-2xl font-gaming font-black text-white mt-3">
            {formatCurrency(summary.revenue.month, currency)}
          </div>
          <div className="mt-2 text-xs font-handwriting text-amber-400/80">
            Current calendar month
          </div>
        </div>

        {/* All Time */}
        <div className="ghost-glass-card p-5 border border-purple-800/40">
          <div className="flex items-center justify-between">
            <span className="font-gaming font-bold text-xs text-cyan-300 uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              ALL-TIME TOTAL
            </span>
          </div>
          <div className="text-2xl font-gaming font-black text-white mt-3">
            {formatCurrency(summary.revenue.allTime, currency)}
          </div>
          <div className="mt-2 text-xs font-handwriting text-cyan-400/80">
            Cumulative gaming center total
          </div>
        </div>
      </div>

      {/* Revenue Breakdown Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Revenue by TV Station */}
        <div className="ghost-glass-card p-5 border border-purple-900/40 space-y-4">
          <h2 className="font-gaming font-bold text-base text-white flex items-center gap-2">
            <Tv className="w-5 h-5 text-purple-400" />
            <span>REVENUE BY TV STATION</span>
          </h2>

          <div className="space-y-3">
            {Object.entries(summary.revenueByConsole).map(([consoleName, amount]) => (
              <div key={consoleName} className="flex items-center justify-between p-3 rounded-xl bg-black/60 border border-purple-900/30">
                <span className="font-gaming font-bold text-sm text-white">{consoleName}</span>
                <span className="font-gaming font-black text-purple-300 text-base">
                  {formatCurrency(amount, currency)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue by Payment Method */}
        <div className="ghost-glass-card p-5 border border-purple-900/40 space-y-4">
          <h2 className="font-gaming font-bold text-base text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-400" />
            <span>PAYMENT METHOD BREAKDOWN</span>
          </h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-black/60 border border-emerald-950">
              <span className="font-gaming font-bold text-sm text-emerald-400">CASH</span>
              <span className="font-gaming font-black text-emerald-300 text-base">
                {formatCurrency(summary.revenueByPaymentMethod.CASH, currency)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-black/60 border border-blue-950">
              <span className="font-gaming font-bold text-sm text-blue-400">TELEBIRR</span>
              <span className="font-gaming font-black text-blue-300 text-base">
                {formatCurrency(summary.revenueByPaymentMethod.TELEBIRR, currency)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-black/60 border border-purple-950">
              <span className="font-gaming font-bold text-sm text-purple-400">CBE BIRR</span>
              <span className="font-gaming font-black text-purple-300 text-base">
                {formatCurrency(summary.revenueByPaymentMethod.CBE, currency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Card at bottom of Reports */}
      <div className="pt-6 border-t border-purple-900/30">
        <GhostPaymentCard size="sm" />
      </div>
    </div>
  );
}

import Link from 'next/link';
import { repository } from '@/lib/repository';
import { formatCurrency } from '@/lib/utils';
import { History, Tv, Calendar, ChevronRight, Zap } from 'lucide-react';
import { GhostPaymentCard } from '@/components/GhostPaymentCard';
import { ClearHistoryButton } from '@/components/ClearHistoryButton';

export const revalidate = 0;

export default async function HistoryPage() {
  const sessions = await repository.getSessionsHistory(100);
  const settings = await repository.getSettings();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ghost-glass-card p-4 sm:p-5 border border-purple-900/40">
        <div>
          <h1 className="text-xl sm:text-2xl font-gaming font-black text-white flex items-center gap-2">
            <History className="w-6 h-6 text-amber-400" />
            <span>SESSION HISTORY</span>
            <span className="text-xl">👻</span>
          </h1>
          <p className="font-handwriting text-purple-300 text-lg sm:text-xl mt-0.5">
            Permanent record ledger of completed gaming sessions
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ClearHistoryButton />
          <div className="text-right font-gaming text-xs text-amber-300 font-bold bg-amber-950/60 px-3.5 py-2 rounded-xl border border-amber-800/60">
            {sessions.length} Recorded Sessions
          </div>
        </div>
      </div>

      {/* History List / Redesigned Empty State */}
      <div className="space-y-3">
        {sessions.length === 0 ? (
          <div className="ghost-glass-card p-12 text-center space-y-3 border border-purple-900/40">
            <div className="text-6xl sm:text-7xl filter drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]">
              👻
            </div>
            <h2 className="font-gaming font-black text-xl sm:text-2xl text-white tracking-wider">
              NO MATCHES YET
            </h2>
            <p className="font-handwriting text-purple-300 text-xl sm:text-2xl max-w-md mx-auto">
              Your gaming history will appear here once sessions are completed on the floor.
            </p>
          </div>
        ) : (
          sessions.map((sess) => {
            const matchesCount = sess.matches?.length || 0;
            const extraCount = sess.matches?.filter((m) => m.extra_time).length || 0;
            const formattedDate = new Date(sess.created_at).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <Link
                key={sess.id}
                href={`/history/${sess.id}`}
                className="ghost-glass-card p-4 block hover:border-purple-500/50 transition-all duration-150 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-950/60 text-purple-300 font-gaming font-bold flex items-center justify-center shrink-0 border border-purple-800">
                      <Tv className="w-5 h-5 text-purple-300" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-gaming font-bold text-base text-white">
                          {sess.console_name || 'TV'}
                        </span>
                        <span className="text-[10px] font-gaming px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-bold">
                          {sess.game_type}
                        </span>
                        <span className={`text-[10px] font-gaming px-1.5 py-0.5 rounded font-bold uppercase ${
                          sess.status === 'FINISHED' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' : 'bg-purple-950 text-purple-300 border border-purple-800'
                        }`}>
                          {sess.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs font-sans text-zinc-400 mt-1">
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                          {formattedDate}
                        </span>
                        <span>•</span>
                        <span>{matchesCount} matches</span>
                        {extraCount > 0 && (
                          <span className="text-amber-400 font-semibold flex items-center gap-0.5 font-mono">
                            <Zap className="w-3 h-3 fill-amber-400" />
                            {extraCount} extra time
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-lg font-gaming font-black text-purple-300">
                        {formatCurrency(sess.total_amount, settings.currency)}
                      </div>
                      <div className="text-[10px] text-zinc-400 uppercase font-bold font-gaming">
                        {sess.payments?.[0]?.method || 'UNPAID'}
                      </div>
                    </div>

                    <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-purple-400 transition-colors" />
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Payment Card at bottom of History */}
      <div className="pt-6 border-t border-purple-900/30">
        <GhostPaymentCard size="sm" />
      </div>
    </div>
  );
}

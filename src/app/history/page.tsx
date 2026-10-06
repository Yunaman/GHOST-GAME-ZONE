import Link from 'next/link';
import { repository } from '@/lib/repository';
import { formatCurrency } from '@/lib/utils';
import { History, Tv, Calendar, ChevronRight, Zap } from 'lucide-react';

export const revalidate = 0;

export default async function HistoryPage() {
  const sessions = await repository.getSessionsHistory(100);
  const settings = await repository.getSettings();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between ghost-glass-card p-4 border border-gray-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-mono font-bold text-white flex items-center gap-2">
            <History className="w-6 h-6 text-amber-400" />
            <span>SESSION HISTORY</span>
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            Permanent ledger of completed and past gaming sessions
          </p>
        </div>

        <div className="text-right font-mono text-xs text-amber-400 font-bold bg-amber-950/60 px-3 py-1.5 rounded-lg border border-amber-800/60">
          {sessions.length} Recorded Sessions
        </div>
      </div>

      {/* History List */}
      <div className="space-y-3">
        {sessions.length === 0 ? (
          <div className="ghost-glass-card p-8 text-center text-gray-500 font-mono text-sm">
            No session history recorded yet. Start a session on the main floor.
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
                className="ghost-glass-card p-4 block hover:border-emerald-500/50 transition-all duration-150 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-800 text-gray-300 font-mono font-bold flex items-center justify-center shrink-0 border border-gray-700">
                      <Tv className="w-5 h-5 text-gray-300" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-base text-white">
                          {sess.console_name || 'TV'}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                          {sess.game_type}
                        </span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                          sess.status === 'FINISHED' ? 'bg-blue-950 text-blue-400 border border-blue-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        }`}>
                          {sess.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs font-mono text-gray-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-gray-500" />
                          {formattedDate}
                        </span>
                        <span>•</span>
                        <span>{matchesCount} matches</span>
                        {extraCount > 0 && (
                          <span className="text-amber-400 font-semibold flex items-center gap-0.5">
                            <Zap className="w-3 h-3 fill-amber-400" />
                            {extraCount} extra time
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right font-mono">
                      <div className="text-lg font-black text-emerald-400">
                        {formatCurrency(sess.total_amount, settings.currency)}
                      </div>
                      <div className="text-[10px] text-gray-400 uppercase font-bold">
                        {sess.payments?.[0]?.method || 'UNPAID'}
                      </div>
                    </div>

                    <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-emerald-400 transition-colors" />
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

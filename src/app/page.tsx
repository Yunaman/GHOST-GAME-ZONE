import { getConsolesWithActiveSessionsAction } from '@/app/actions';
import { ConsoleCard } from '@/components/ConsoleCard';
import { AlertCircle } from 'lucide-react';

export const revalidate = 0; // Dynamic server component

export default async function DashboardPage() {
  const result = await getConsolesWithActiveSessionsAction();

  if (!result.success || !result.data) {
    return (
      <div className="p-6 bg-rose-950/40 border border-rose-800 rounded-xl text-rose-300 font-mono text-sm flex items-center gap-3">
        <AlertCircle className="w-6 h-6 text-rose-400 shrink-0" />
        <div>
          <h3 className="font-bold text-rose-200">System Error</h3>
          <p>{result.error || 'Failed to load floor gaming stations'}</p>
        </div>
      </div>
    );
  }

  const consolesWithSessions = result.data;
  const settings = result.settings || { fifa_normal_price: 15, fifa_extra_time_price: 5, currency: 'ETB', id: 'default', updated_at: '' };

  return (
    <div className="space-y-6">
      {/* Top Floor Header */}
      <div className="flex items-center justify-between bg-[#161a23] p-4 rounded-xl border border-gray-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-mono font-bold text-white flex items-center gap-2">
            <span>GAMING FLOOR</span>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-700/50">
              3 TVs ACTIVE
            </span>
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            Tap "+ MATCH" as soon as a FIFA game completes.
          </p>
        </div>

        <div className="hidden sm:block text-right font-mono text-xs text-gray-400">
          <div>FIFA Price: <span className="font-bold text-emerald-400">{settings.fifa_normal_price} {settings.currency}</span></div>
          <div>Extra Time: <span className="font-bold text-amber-400">+{settings.fifa_extra_time_price} {settings.currency}</span></div>
        </div>
      </div>

      {/* 3 TVs Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {consolesWithSessions.map((cs) => (
          <ConsoleCard
            key={cs.console.id}
            consoleState={cs}
            settings={settings}
          />
        ))}
      </div>
    </div>
  );
}

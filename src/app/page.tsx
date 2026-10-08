import { getConsolesWithActiveSessionsAction } from '@/app/actions';
import { ConsoleCard } from '@/components/ConsoleCard';
import { GhostPaymentCard } from '@/components/GhostPaymentCard';
import { InstallAppCard } from '@/components/InstallAppCard';
import { AlertCircle } from 'lucide-react';

export const revalidate = 0; // Dynamic server component

export default async function DashboardPage() {
  const result = await getConsolesWithActiveSessionsAction();

  if (!result.success || !result.data) {
    return (
      <div className="p-6 bg-rose-950/40 border border-rose-800 rounded-xl text-rose-300 font-sans text-sm flex items-center gap-3">
        <AlertCircle className="w-6 h-6 text-rose-400 shrink-0" />
        <div>
          <h3 className="font-gaming font-bold text-rose-200">System Error</h3>
          <p>{result.error || 'Failed to load floor gaming stations'}</p>
        </div>
      </div>
    );
  }

  const consolesWithSessions = result.data;
  const settings = result.settings || { fifa_normal_price: 15, fifa_extra_time_price: 5, currency: 'ETB', id: 'default', updated_at: '' };

  const activeTvCount = consolesWithSessions.filter(c => c.console.is_active).length;

  return (
    <div className="space-y-8">
      {/* Top Floor Control Room Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-black/60 p-4 sm:p-5 rounded-2xl border border-purple-900/40 shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-gaming font-black text-white tracking-wider flex items-center gap-2">
              <span>GAMING FLOOR</span>
              <span className="text-xl">👻</span>
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-700/60 font-gaming font-bold">
              {activeTvCount} TVs ACTIVE
            </span>
          </div>
          <p className="font-handwriting text-purple-300 text-lg sm:text-xl mt-0.5">
            Tap "+ MATCH" as soon as a FIFA game completes on any TV.
          </p>
        </div>

        <div className="bg-black/80 px-3.5 py-2 rounded-xl border border-purple-900/40 text-xs text-zinc-300 font-sans flex items-center gap-4">
          <div>
            <span className="font-handwriting text-zinc-400 text-base">FIFA Match:</span>{' '}
            <span className="font-gaming font-bold text-purple-300 text-sm">{settings.fifa_normal_price} {settings.currency}</span>
          </div>
          <div className="border-l border-purple-900/40 pl-4">
            <span className="font-handwriting text-zinc-400 text-base">Extra Time:</span>{' '}
            <span className="font-gaming font-bold text-amber-400 text-sm">+{settings.fifa_extra_time_price} {settings.currency}</span>
          </div>
        </div>
      </div>

      {/* TVs Cards Adaptive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {consolesWithSessions.map((cs) => (
          <ConsoleCard
            key={cs.console.id}
            consoleState={cs}
            settings={settings}
          />
        ))}
      </div>

      {/* Post-Intro Install PWA Prompt Card */}
      <InstallAppCard />

      {/* Post-Intro Dashboard Floor Payment Card Poster */}
      <div className="pt-6 border-t border-purple-900/30">
        <GhostPaymentCard size="md" />
      </div>
    </div>
  );
}

import { repository } from '@/lib/repository';
import { SettingsForm } from '@/components/SettingsForm';
import { GhostPaymentCard } from '@/components/GhostPaymentCard';
import { Settings, ShieldCheck } from 'lucide-react';

export const revalidate = 0;

export default async function SettingsPage() {
  const settings = await repository.getSettings();
  const consoles = await repository.getConsoles();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between ghost-glass-card p-4 sm:p-5 border border-purple-900/40">
        <div>
          <h1 className="text-xl sm:text-2xl font-gaming font-black text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-purple-400" />
            <span>SYSTEM SETTINGS</span>
            <span className="text-xl">👻</span>
          </h1>
          <p className="font-handwriting text-purple-300 text-lg sm:text-xl mt-0.5">
            Configure pricing, currency, visual theme, and TV stations
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-gaming font-bold text-purple-300 bg-purple-950/60 px-3 py-1.5 rounded-xl border border-purple-800">
          <ShieldCheck className="w-4 h-4 text-purple-400" />
          <span>Manager/Owner Level</span>
        </div>
      </div>

      <SettingsForm settings={settings} consoles={consoles} />

      {/* Payment Card at bottom of Settings */}
      <div className="pt-6 border-t border-purple-900/30">
        <GhostPaymentCard size="sm" />
      </div>
    </div>
  );
}

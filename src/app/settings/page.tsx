import { repository } from '@/lib/repository';
import { SettingsForm } from '@/components/SettingsForm';
import { Settings, ShieldCheck } from 'lucide-react';

export const revalidate = 0;

export default async function SettingsPage() {
  const settings = await repository.getSettings();
  const consoles = await repository.getConsoles();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-[#161a23] p-4 rounded-xl border border-gray-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-mono font-bold text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-emerald-400" />
            <span>SYSTEM SETTINGS</span>
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            Configure pricing, currency, and TV gaming station labels
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-800/50">
          <ShieldCheck className="w-4 h-4" />
          <span>Manager/Owner Level</span>
        </div>
      </div>

      <SettingsForm settings={settings} consoles={consoles} />
    </div>
  );
}

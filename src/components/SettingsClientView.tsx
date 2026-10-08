'use client';

import { useState, useEffect } from 'react';
import { Settings, Console } from '@/types';
import { offlineRepository } from '@/lib/repository/offline-repository';
import { SettingsForm } from '@/components/SettingsForm';
import { GhostPaymentCard } from '@/components/GhostPaymentCard';
import { Settings as SettingsIcon, ShieldCheck } from 'lucide-react';

interface SettingsClientViewProps {
  initialSettings?: Settings | null;
  initialConsoles?: Console[] | null;
}

export function SettingsClientView({ initialSettings, initialConsoles }: SettingsClientViewProps) {
  const [settings, setSettings] = useState<Settings>(
    initialSettings || {
      id: 'default',
      fifa_normal_price: 15,
      fifa_extra_time_price: 5,
      currency: 'ETB',
      updated_at: new Date().toISOString(),
    }
  );

  const [consoles, setConsoles] = useState<Console[]>(initialConsoles || []);

  const loadData = async () => {
    try {
      const localSettings = await offlineRepository.getSettings();
      const localConsoles = await offlineRepository.getConsoles();
      if (localSettings) setSettings(localSettings);
      if (localConsoles && localConsoles.length > 0) setConsoles(localConsoles);
    } catch (err) {
      // Fallback
    }
  };

  useEffect(() => {
    if (initialSettings) setSettings(initialSettings);
    if (initialConsoles) setConsoles(initialConsoles);
  }, [initialSettings, initialConsoles]);

  useEffect(() => {
    loadData();

    const handleDataUpdate = () => {
      loadData();
    };

    window.addEventListener('ghost_data_updated', handleDataUpdate);
    return () => {
      window.removeEventListener('ghost_data_updated', handleDataUpdate);
    };
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between ghost-glass-card p-4 sm:p-5 border border-purple-900/40">
        <div>
          <h1 className="text-xl sm:text-2xl font-gaming font-black text-white flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-purple-400" />
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

'use client';

import { useState } from 'react';
import { Settings, Console } from '@/types';
import { updateSettingsAction, updateConsoleNameAction } from '@/app/actions';
import { Save, Check, Loader2, Tv, DollarSign } from 'lucide-react';

interface SettingsFormProps {
  settings: Settings;
  consoles: Console[];
}

export function SettingsForm({ settings, consoles }: SettingsFormProps) {
  const [fifaNormalPrice, setFifaNormalPrice] = useState<number>(settings.fifa_normal_price);
  const [fifaExtraTimePrice, setFifaExtraTimePrice] = useState<number>(settings.fifa_extra_time_price);
  const [currency, setCurrency] = useState<string>(settings.currency);

  const [consoleNames, setConsoleNames] = useState<Record<string, string>>(
    consoles.reduce((acc, c) => ({ ...acc, [c.id]: c.name }), {})
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setMsg(null);

    try {
      // Update settings
      const settingsRes = await updateSettingsAction(fifaNormalPrice, fifaExtraTimePrice, currency.trim());
      if (!settingsRes.success) {
        throw new Error(settingsRes.error || 'Failed to update pricing settings');
      }

      // Update console names
      for (const consoleItem of consoles) {
        const newName = consoleNames[consoleItem.id];
        if (newName && newName !== consoleItem.name) {
          await updateConsoleNameAction(consoleItem.id, newName.trim());
        }
      }

      setMsg({ type: 'success', text: 'Settings updated successfully!' });
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.message || 'Error saving settings' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* FIFA Pricing Section */}
      <div className="paper-card p-5 space-y-4">
        <h2 className="font-mono font-bold text-base text-gray-900 uppercase flex items-center gap-2 border-b border-gray-200 pb-3">
          <DollarSign className="w-5 h-5 text-emerald-600" />
          <span>FIFA Pricing & Currency Configuration</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
          <div>
            <label className="block font-bold text-gray-700 uppercase mb-1">
              Normal Match Price ({currency})
            </label>
            <input
              type="number"
              step="1"
              value={fifaNormalPrice}
              onChange={(e) => setFifaNormalPrice(Number(e.target.value))}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 uppercase mb-1">
              Extra Time Add-on Price ({currency})
            </label>
            <input
              type="number"
              step="1"
              value={fifaExtraTimePrice}
              onChange={(e) => setFifaExtraTimePrice(Number(e.target.value))}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 uppercase mb-1">
              Currency Code
            </label>
            <input
              type="text"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* TV Console Naming */}
      <div className="paper-card p-5 space-y-4">
        <h2 className="font-mono font-bold text-base text-gray-900 uppercase flex items-center gap-2 border-b border-gray-200 pb-3">
          <Tv className="w-5 h-5 text-blue-600" />
          <span>Gaming TV Console Station Names</span>
        </h2>

        <div className="space-y-3 font-mono text-xs">
          {consoles.map((c) => (
            <div key={c.id} className="flex items-center gap-3">
              <span className="w-20 font-bold text-gray-600">Station ID: {c.id}</span>
              <input
                type="text"
                value={consoleNames[c.id] || ''}
                onChange={(e) => setConsoleNames({ ...consoleNames, [c.id]: e.target.value })}
                className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>
      </div>

      {msg && (
        <div className={`p-3 rounded-xl font-mono text-xs ${
          msg.type === 'success' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
        }`}>
          {msg.text}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full sm:w-auto px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-mono font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 tactile-button transition-all disabled:opacity-50"
      >
        {isSubmitting ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <Save className="w-5 h-5" />
            <span>SAVE SYSTEM SETTINGS</span>
          </>
        )}
      </button>
    </form>
  );
}

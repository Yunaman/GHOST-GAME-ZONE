'use client';

import { useState } from 'react';
import { Settings, Console } from '@/types';
import {
  updateSettingsAction,
  updateConsoleNameAction,
  addConsoleAction,
  toggleConsoleActiveAction,
} from '@/app/actions';
import { Save, Loader2, Tv, DollarSign, Plus, ToggleLeft, ToggleRight } from 'lucide-react';

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

  const [consoleActiveState, setConsoleActiveState] = useState<Record<string, boolean>>(
    consoles.reduce((acc, c) => ({ ...acc, [c.id]: c.is_active !== false }), {})
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingTv, setIsAddingTv] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleAddTv() {
    setIsAddingTv(true);
    setMsg(null);
    try {
      const res = await addConsoleAction();
      if (res.success && res.data) {
        setMsg({ type: 'success', text: `Successfully created ${res.data.name}!` });
      } else {
        setMsg({ type: 'error', text: res.error || 'Failed to add TV' });
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.message || 'Error adding TV' });
    } finally {
      setIsAddingTv(false);
    }
  }

  async function handleToggleActive(consoleId: string, currentActive: boolean) {
    const nextState = !currentActive;
    setConsoleActiveState({ ...consoleActiveState, [consoleId]: nextState });
    try {
      await toggleConsoleActiveAction(consoleId, nextState);
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Failed to update TV active status' });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setMsg(null);

    try {
      const settingsRes = await updateSettingsAction(fifaNormalPrice, fifaExtraTimePrice, currency.trim());
      if (!settingsRes.success) {
        throw new Error(settingsRes.error || 'Failed to update pricing settings');
      }

      for (const consoleItem of consoles) {
        const newName = consoleNames[consoleItem.id];
        if (newName && newName !== consoleItem.name) {
          await updateConsoleNameAction(consoleItem.id, newName.trim());
        }
      }

      setMsg({ type: 'success', text: 'System settings saved successfully!' });
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.message || 'Error saving settings' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* FIFA Pricing Section */}
      <div className="ghost-glass-card p-5 space-y-4">
        <h2 className="font-gaming font-bold text-base text-white uppercase flex items-center gap-2 border-b border-gray-800 pb-3">
          <DollarSign className="w-5 h-5 text-emerald-400" />
          <span>FIFA PRICING & CURRENCY</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-handwriting text-gray-300 text-lg mb-1">
              Normal Match Price ({currency})
            </label>
            <input
              type="number"
              step="1"
              value={fifaNormalPrice}
              onChange={(e) => setFifaNormalPrice(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-white font-gaming font-bold text-sm outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block font-handwriting text-gray-300 text-lg mb-1">
              Extra Time Add-on ({currency})
            </label>
            <input
              type="number"
              step="1"
              value={fifaExtraTimePrice}
              onChange={(e) => setFifaExtraTimePrice(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-white font-gaming font-bold text-sm outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block font-handwriting text-gray-300 text-lg mb-1">
              Currency Code
            </label>
            <input
              type="text"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-white font-gaming font-bold text-sm outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* TV Console Station Management */}
      <div className="ghost-glass-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <h2 className="font-gaming font-bold text-base text-white uppercase flex items-center gap-2">
            <Tv className="w-5 h-5 text-blue-400" />
            <span>GAMING TV STATIONS ({consoles.length})</span>
          </h2>

          <button
            type="button"
            onClick={handleAddTv}
            disabled={isAddingTv}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-gaming font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md transition-all disabled:opacity-50"
          >
            {isAddingTv ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ ADD TV 👻</span>
              </>
            )}
          </button>
        </div>

        <div className="space-y-3 text-xs">
          {consoles.map((c) => {
            const isActive = consoleActiveState[c.id] ?? (c.is_active !== false);
            return (
              <div
                key={c.id}
                className="p-3 bg-gray-950/80 border border-gray-800 rounded-xl flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-gray-500 text-[11px] font-mono font-bold uppercase w-12">
                    {c.id}
                  </span>
                  <input
                    type="text"
                    value={consoleNames[c.id] || ''}
                    onChange={(e) => setConsoleNames({ ...consoleNames, [c.id]: e.target.value })}
                    className="px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-white font-gaming font-bold text-sm outline-none focus:border-blue-500 max-w-xs"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-gaming uppercase font-bold px-2 py-0.5 rounded ${
                    isActive ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                  }`}>
                    {isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleToggleActive(c.id, isActive)}
                    className="p-1.5 text-gray-400 hover:text-white transition-colors cursor-pointer"
                    title={isActive ? 'Deactivate TV' : 'Activate TV'}
                  >
                    {isActive ? (
                      <ToggleRight className="w-6 h-6 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-gray-600" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {msg && (
        <div className={`p-3 rounded-xl font-sans text-xs ${
          msg.type === 'success' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800' : 'bg-rose-950/80 text-rose-300 border border-rose-800'
        }`}>
          {msg.text}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full sm:w-auto px-6 py-3.5 ghost-btn-primary font-gaming font-bold text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
      >
        {isSubmitting ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <Save className="w-5 h-5 text-black" />
            <span className="text-black">SAVE CONFIGURATION 👻</span>
          </>
        )}
      </button>
    </form>
  );
}

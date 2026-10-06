'use client';

import { useState } from 'react';
import { Settings, Console } from '@/types';
import {
  updateSettingsAction,
  updateConsoleNameAction,
  addConsoleAction,
  toggleConsoleActiveAction,
} from '@/app/actions';
import { Save, Loader2, Tv, DollarSign, Plus, ToggleLeft, ToggleRight, Palette } from 'lucide-react';
import { useTheme, AppTheme } from '@/components/ThemeProvider';

interface SettingsFormProps {
  settings: Settings;
  consoles: Console[];
}

export function SettingsForm({ settings, consoles }: SettingsFormProps) {
  const { theme, setTheme } = useTheme();
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

  const themesList: { id: AppTheme; name: string; tag: string; bg: string; border: string }[] = [
    { id: 'theme-purple', name: 'GHOST PURPLE', tag: 'DEFAULT', bg: 'bg-purple-950/80', border: 'border-purple-500' },
    { id: 'theme-green', name: 'CURRENT GREEN', tag: 'PAPER', bg: 'bg-emerald-950/80', border: 'border-emerald-500' },
    { id: 'theme-gold', name: 'GOLD VIP', tag: 'PREMIUM', bg: 'bg-amber-950/80', border: 'border-amber-500' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Visual Identity Theme System */}
      <div className="ghost-glass-card p-5 space-y-4">
        <h2 className="font-gaming font-bold text-base text-white uppercase flex items-center gap-2 border-b border-purple-900/40 pb-3">
          <Palette className="w-5 h-5 text-purple-400" />
          <span>VISUAL THEME SYSTEM</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {themesList.map((t) => {
            const isSelected = theme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t.id)}
                className={`p-4 rounded-xl border-2 text-left flex flex-col justify-between transition-all cursor-pointer ${t.bg} ${
                  isSelected ? `${t.border} ring-2 ring-purple-400 scale-[1.02]` : 'border-zinc-800 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-gaming font-bold text-sm text-white">{t.name}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/60 text-purple-300 font-bold border border-purple-500/30">
                    {t.tag}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-zinc-300">
                  <div className={`w-3 h-3 rounded-full ${isSelected ? 'bg-purple-400 animate-pulse' : 'bg-zinc-600'}`} />
                  <span className="font-mono text-[11px]">{isSelected ? 'ACTIVE THEME' : 'SELECT THEME'}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* FIFA Pricing Section */}
      <div className="ghost-glass-card p-5 space-y-4">
        <h2 className="font-gaming font-bold text-base text-white uppercase flex items-center gap-2 border-b border-purple-900/40 pb-3">
          <DollarSign className="w-5 h-5 text-emerald-400" />
          <span>FIFA PRICING &amp; CURRENCY</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-handwriting text-zinc-300 text-lg mb-1">
              Normal Match Price ({currency})
            </label>
            <input
              type="number"
              step="1"
              value={fifaNormalPrice}
              onChange={(e) => setFifaNormalPrice(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-black/80 border border-purple-900/50 rounded-xl text-white font-gaming font-bold text-sm outline-none focus:border-purple-400"
            />
          </div>

          <div>
            <label className="block font-handwriting text-zinc-300 text-lg mb-1">
              Extra Time Add-on ({currency})
            </label>
            <input
              type="number"
              step="1"
              value={fifaExtraTimePrice}
              onChange={(e) => setFifaExtraTimePrice(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-black/80 border border-purple-900/50 rounded-xl text-white font-gaming font-bold text-sm outline-none focus:border-purple-400"
            />
          </div>

          <div>
            <label className="block font-handwriting text-zinc-300 text-lg mb-1">
              Currency Code
            </label>
            <input
              type="text"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-black/80 border border-purple-900/50 rounded-xl text-white font-gaming font-bold text-sm outline-none focus:border-purple-400"
            />
          </div>
        </div>
      </div>

      {/* TV Console Station Management */}
      <div className="ghost-glass-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
          <h2 className="font-gaming font-bold text-base text-white uppercase flex items-center gap-2">
            <Tv className="w-5 h-5 text-purple-400" />
            <span>GAMING TV STATIONS ({consoles.length})</span>
          </h2>

          <button
            type="button"
            onClick={handleAddTv}
            disabled={isAddingTv}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-gaming font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md transition-all disabled:opacity-50 border border-purple-400"
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
                className="p-3 bg-black/60 border border-purple-900/40 rounded-xl flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-zinc-500 text-[11px] font-mono font-bold uppercase w-12">
                    {c.id}
                  </span>
                  <input
                    type="text"
                    value={consoleNames[c.id] || ''}
                    onChange={(e) => setConsoleNames({ ...consoleNames, [c.id]: e.target.value })}
                    className="px-3 py-1.5 bg-black/80 border border-purple-900/50 rounded-lg text-white font-gaming font-bold text-sm outline-none focus:border-purple-400 max-w-xs"
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
                    className="p-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    title={isActive ? 'Deactivate TV' : 'Activate TV'}
                  >
                    {isActive ? (
                      <ToggleRight className="w-6 h-6 text-purple-400" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-zinc-600" />
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
          msg.type === 'success' ? 'bg-purple-950/80 text-purple-200 border border-purple-800' : 'bg-rose-950/80 text-rose-300 border border-rose-800'
        }`}>
          {msg.text}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full sm:w-auto px-8 py-3.5 ghost-btn-primary font-gaming font-bold text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
      >
        {isSubmitting ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <Save className="w-5 h-5" />
            <span>SAVE CONFIGURATION 👻</span>
          </>
        )}
      </button>
    </form>
  );
}

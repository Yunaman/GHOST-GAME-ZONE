'use client';

import { useState } from 'react';
import { clearTodayHistoryAction } from '@/app/actions';
import { Trash2, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function ClearHistoryButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleClearHistory() {
    if (confirmInput.trim().toUpperCase() !== 'CLEAR HISTORY') {
      setErrorMsg('Please type "CLEAR HISTORY" to confirm.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await clearTodayHistoryAction();
      if (res.success) {
        setSuccessMsg(`Successfully cleared ${res.deletedCount} completed sessions from today's history.`);
        setIsOpen(false);
        setConfirmInput('');
        router.refresh();
      } else {
        setErrorMsg(res.error || 'Failed to clear history');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error clearing history');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div>
        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-950/80 border border-emerald-700 text-emerald-300 rounded-xl text-xs flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {successMsg}
            </span>
            <button
              onClick={() => setSuccessMsg(null)}
              className="text-emerald-400 hover:text-white font-bold"
            >
              ✕
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setErrorMsg(null);
            setConfirmInput('');
          }}
          className="px-3.5 py-2 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/80 hover:border-rose-600 rounded-xl font-gaming font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md"
        >
          <Trash2 className="w-4 h-4 text-rose-400" />
          <span>Clear Today's History</span>
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#120d21] border-2 border-rose-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-[0_0_30px_rgba(225,29,72,0.3)]">
            <div className="flex items-center gap-3 text-rose-400 border-b border-rose-900/40 pb-3">
              <div className="p-2 bg-rose-950/80 border border-rose-800 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="font-gaming font-black text-lg text-white">
                  CLEAR TODAY'S HISTORY?
                </h3>
                <p className="text-xs text-rose-300 font-sans">
                  Double Confirmation Required
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed font-sans bg-black/40 p-3 rounded-xl border border-purple-900/30">
              This will permanently remove today's completed sessions and their related match/payment history. <strong className="text-emerald-400">Active sessions, consoles, and settings will not be affected.</strong>
            </p>

            {errorMsg && (
              <p className="text-xs text-rose-400 font-bold bg-rose-950/80 p-2.5 rounded-lg border border-rose-800">
                {errorMsg}
              </p>
            )}

            <div className="space-y-2">
              <label className="block text-xs font-gaming font-bold text-zinc-300">
                Type <span className="text-rose-400 font-mono">CLEAR HISTORY</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="CLEAR HISTORY"
                className="w-full px-3.5 py-2.5 bg-black/60 border border-rose-800/80 rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-rose-500 uppercase"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
                className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-gaming font-bold cursor-pointer transition-colors"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleClearHistory}
                disabled={isLoading || confirmInput.trim().toUpperCase() !== 'CLEAR HISTORY'}
                className="px-5 py-2.5 ghost-btn-danger font-gaming font-black text-xs rounded-xl flex items-center gap-2 cursor-pointer disabled:opacity-40"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>CLEAR HISTORY 👻</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

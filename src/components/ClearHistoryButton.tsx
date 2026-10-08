'use client';

import { useState } from 'react';
import { clearCompletedHistoryAction } from '@/app/actions';
import { Trash2, Loader2, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function ClearHistoryButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleClearHistory() {
    console.log('[CLEAR HISTORY] CLICKED');
    if (isLoading) return;
    setIsLoading(true);
    setErrorMsg(null);
    setIsSuccess(false);

    try {
      console.log('[CLEAR HISTORY] CALLING ACTION');
      const res = await clearCompletedHistoryAction();
      console.log('[CLEAR HISTORY] ACTION RESULT:', res);

      if (res.success) {
        setIsSuccess(true);
        router.refresh();
        setTimeout(() => setIsSuccess(false), 2500);
      } else {
        setErrorMsg(res.error || 'Failed to clear history');
      }
    } catch (err: any) {
      console.error('[CLEAR HISTORY] ERROR:', err);
      setErrorMsg(err?.message || 'Error clearing history');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-end">
      {errorMsg && (
        <span className="text-[11px] text-rose-400 font-bold bg-rose-950/90 px-2 py-0.5 rounded border border-rose-800 mb-1">
          {errorMsg}
        </span>
      )}

      <button
        type="button"
        onClick={handleClearHistory}
        disabled={isLoading}
        className="px-3.5 py-2 bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800 hover:border-rose-600 rounded-xl font-gaming font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 disabled:opacity-50 relative z-10"
        title="Immediately clear all completed session records"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-rose-300" />
        ) : isSuccess ? (
          <Check className="w-4 h-4 text-emerald-400" />
        ) : (
          <Trash2 className="w-4 h-4 text-rose-400" />
        )}
        <span>{isSuccess ? 'CLEARED 👻' : 'CLEAR HISTORY'}</span>
      </button>
    </div>
  );
}

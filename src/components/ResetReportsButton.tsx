'use client';

import { useState } from 'react';
import { resetReportsAction } from '@/app/actions';
import { RotateCcw, Loader2, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function ResetReportsButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleReset() {
    console.log('[RESET REPORTS] CLICKED');
    if (isLoading) return;
    setIsLoading(true);
    setErrorMsg(null);
    setIsSuccess(false);

    try {
      console.log('[RESET REPORTS] CALLING ACTION');
      const res = await resetReportsAction();
      console.log('[RESET REPORTS] ACTION RESULT:', res);

      if (res.success) {
        setIsSuccess(true);
        router.refresh();
        setTimeout(() => setIsSuccess(false), 2500);
      } else {
        setErrorMsg(res.error || 'Failed to reset reports');
      }
    } catch (err: any) {
      console.error('[RESET REPORTS] ERROR:', err);
      setErrorMsg(err?.message || 'Error resetting reports');
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
        onClick={handleReset}
        disabled={isLoading}
        className="px-3.5 py-2 bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-700/80 rounded-xl font-gaming font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 disabled:opacity-50 relative z-10"
        title="Immediately reset report metrics to zero"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-purple-300" />
        ) : isSuccess ? (
          <Check className="w-4 h-4 text-emerald-400" />
        ) : (
          <RotateCcw className="w-4 h-4 text-purple-400" />
        )}
        <span>{isSuccess ? 'RESET 👻' : 'RESET REPORTS'}</span>
      </button>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { resetReportsAction } from '@/app/actions';
import { RotateCcw, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function ResetReportsButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleReset() {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await resetReportsAction();
      if (res.success) {
        setSuccessMsg('Reports metrics reset to zero.');
        setIsOpen(false);
        router.refresh();
      } else {
        setErrorMsg(res.error || 'Failed to reset reports');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error resetting reports');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div>
        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-950/80 border border-emerald-700 text-emerald-300 rounded-xl text-xs flex items-center justify-between font-sans">
            <span className="flex items-center gap-2 font-bold">
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
          }}
          className="px-3.5 py-2 bg-purple-950/80 hover:bg-purple-900/90 text-purple-200 border border-purple-700/80 rounded-xl font-gaming font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md"
        >
          <RotateCcw className="w-4 h-4 text-purple-400" />
          <span>RESET REPORTS</span>
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#120d21] border-2 border-purple-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-[0_0_30px_rgba(168,85,247,0.3)]">
            <div className="flex items-center gap-3 text-purple-300 border-b border-purple-900/40 pb-3">
              <div className="p-2 bg-purple-950/80 border border-purple-800 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="font-gaming font-black text-lg text-white">
                  Reset Reports?
                </h3>
                <p className="text-xs text-purple-300 font-sans">
                  This will reset the completed business records used by Reports.
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed font-sans bg-black/40 p-3 rounded-xl border border-purple-900/30">
              Active sessions will <strong className="text-emerald-400">not be affected</strong>.
            </p>

            {errorMsg && (
              <p className="text-xs text-rose-400 font-bold bg-rose-950/80 p-2.5 rounded-lg border border-rose-800">
                {errorMsg}
              </p>
            )}

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
                onClick={handleReset}
                disabled={isLoading}
                className="px-5 py-2.5 bg-purple-900 hover:bg-purple-800 text-white font-gaming font-black text-xs rounded-xl flex items-center gap-2 cursor-pointer border border-purple-600 shadow-md disabled:opacity-40"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>RESET REPORTS</span>
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

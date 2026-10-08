'use client';

import { useState } from 'react';
import { Session, PaymentMethod } from '@/types';
import { finishSessionAction } from '@/app/actions';
import { formatCurrency } from '@/lib/utils';
import { notifyDataChanged } from '@/lib/sync/sync-engine';
import { Check, CreditCard, Banknote, Building2, X, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface FinishSessionModalProps {
  session: Session;
  currency: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function FinishSessionModal({ session, currency, onClose, onSuccess }: FinishSessionModalProps) {
  const router = useRouter();
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const matchCount = session.matches?.length || 0;
  const extraTimeCount = session.matches?.filter((m) => m.extra_time).length || 0;

  async function handleFinish() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await finishSessionAction(session.id, method, reference.trim());
      if (res.success) {
        notifyDataChanged();
        router.refresh();
        if (onSuccess) {
          onSuccess();
        } else {
          onClose();
        }
      } else {
        setError(res.error || 'Failed to finish session');
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setError(err?.message || 'Error finishing session');
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#0e121a] text-gray-100 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden border border-gray-800">
        {/* Header */}
        <div className="bg-[#151a26] px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-gaming font-bold uppercase tracking-widest text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800/60">
              FINISH & COLLECT 👻
            </span>
            <h2 className="text-xl font-gaming font-black text-white mt-1">
              {session.console_name || 'TV'} SESSION SUMMARY
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Summary Box */}
          <div className="bg-[#080a0f] p-4 rounded-xl border border-gray-800 space-y-2 text-sm">
            <div className="flex justify-between text-gray-400 font-sans text-xs">
              <span className="font-handwriting text-lg text-gray-400">Game Type:</span>
              <span className="font-gaming font-bold text-white">FIFA (MATCH BASED)</span>
            </div>
            <div className="flex justify-between font-sans text-gray-300">
              <span className="font-handwriting text-lg text-gray-400">Completed Matches:</span>
              <span className="font-gaming font-bold text-white text-base">{matchCount}</span>
            </div>
            <div className="flex justify-between font-sans text-gray-300">
              <span className="font-handwriting text-lg text-gray-400">Extra Time Add-ons (+5):</span>
              <span className="font-gaming font-bold text-amber-400 text-base">{extraTimeCount}</span>
            </div>

            <div className="border-t border-gray-800 pt-3 mt-3 flex justify-between items-baseline font-gaming">
              <span className="font-bold text-base text-gray-300">TOTAL DUE:</span>
              <span className="text-3xl font-black text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.35)]">
                {formatCurrency(session.total_amount, currency)}
              </span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-gaming uppercase font-bold text-gray-400 mb-2">
              SELECT PAYMENT METHOD
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMethod('CASH')}
                className={`py-3 px-2 rounded-xl border flex flex-col items-center gap-1 font-gaming text-xs font-bold cursor-pointer transition-all ${
                  method === 'CASH'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg scale-[1.02]'
                    : 'bg-gray-900/80 text-gray-400 border-gray-800 hover:bg-gray-800'
                }`}
              >
                <Banknote className="w-5 h-5" />
                <span>CASH</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('TELEBIRR')}
                className={`py-3 px-2 rounded-xl border flex flex-col items-center gap-1 font-gaming text-xs font-bold cursor-pointer transition-all ${
                  method === 'TELEBIRR'
                    ? 'bg-blue-600 text-white border-blue-500 shadow-lg scale-[1.02]'
                    : 'bg-gray-900/80 text-gray-400 border-gray-800 hover:bg-gray-800'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span>TELEBIRR</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('CBE')}
                className={`py-3 px-2 rounded-xl border flex flex-col items-center gap-1 font-gaming text-xs font-bold cursor-pointer transition-all ${
                  method === 'CBE'
                    ? 'bg-purple-600 text-white border-purple-500 shadow-lg scale-[1.02]'
                    : 'bg-gray-900/80 text-gray-400 border-gray-800 hover:bg-gray-800'
                }`}
              >
                <Building2 className="w-5 h-5" />
                <span>CBE BIRR</span>
              </button>
            </div>
          </div>

          {/* Optional Reference Field for Digital Payment */}
          {method !== 'CASH' && (
            <div className="animate-in fade-in duration-150">
              <label className="block text-xs font-gaming uppercase font-bold text-gray-400 mb-1">
                TRANSACTION / REFERENCE # (OPTIONAL)
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g., TXN-984214"
                className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-white font-mono text-sm focus:border-emerald-500 outline-none"
              />
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-sans rounded-xl">
              {error}
            </div>
          )}

          {/* Confirm Button */}
          <button
            type="button"
            onClick={handleFinish}
            disabled={isSubmitting}
            className="w-full py-4 ghost-btn-primary font-gaming font-bold text-base rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-6 h-6 animate-spin text-black" />
            ) : (
              <Check className="w-6 h-6 text-black" />
            )}
            <span className="text-black">
              {isSubmitting ? 'CLOSING SESSION...' : 'CONFIRM & CLOSE SESSION 👻'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

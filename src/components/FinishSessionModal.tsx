'use client';

import { useState } from 'react';
import { Session, PaymentMethod } from '@/types';
import { finishSessionAction } from '@/app/actions';
import { formatCurrency } from '@/lib/utils';
import { Check, CreditCard, Banknote, Building2, X, Loader2 } from 'lucide-react';

interface FinishSessionModalProps {
  session: Session;
  currency: string;
  onClose: () => void;
}

export function FinishSessionModal({ session, currency, onClose }: FinishSessionModalProps) {
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [reference, setReference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matchCount = session.matches?.length || 0;
  const extraTimeCount = session.matches?.filter((m) => m.extra_time).length || 0;

  async function handleFinish() {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await finishSessionAction(session.id, method, reference.trim());
      if (res.success) {
        onClose();
      } else {
        setError(res.error || 'Failed to complete session payment');
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#121620] text-gray-100 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden border border-gray-800">
        {/* Header */}
        <div className="bg-[#181d2a] px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
              FINISH & COLLECT
            </span>
            <h2 className="text-xl font-bold font-mono text-white mt-1">
              {session.console_name || 'TV'} SESSION SUMMARY
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-800 text-gray-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Summary Box */}
          <div className="bg-[#0b0e14] p-4 rounded-xl border border-gray-800 space-y-2 text-sm">
            <div className="flex justify-between text-gray-400 font-mono text-xs">
              <span>Game Type:</span>
              <span className="font-bold text-white">FIFA (MATCH BASED)</span>
            </div>
            <div className="flex justify-between font-mono text-gray-300">
              <span>Total Completed Matches:</span>
              <span className="font-bold text-white">{matchCount}</span>
            </div>
            <div className="flex justify-between font-mono text-gray-300">
              <span>Extra Time Matches (+5):</span>
              <span className="font-bold text-amber-400">{extraTimeCount}</span>
            </div>

            <div className="border-t border-gray-800 pt-3 mt-3 flex justify-between items-baseline font-mono">
              <span className="font-bold text-base text-gray-300">TOTAL DUE:</span>
              <span className="text-2xl font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                {formatCurrency(session.total_amount, currency)}
              </span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-mono uppercase font-bold text-gray-400 mb-2">
              Select Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMethod('CASH')}
                className={`py-3 px-2 rounded-xl border flex flex-col items-center gap-1 font-mono text-xs font-bold cursor-pointer transition-all ${
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
                className={`py-3 px-2 rounded-xl border flex flex-col items-center gap-1 font-mono text-xs font-bold cursor-pointer transition-all ${
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
                className={`py-3 px-2 rounded-xl border flex flex-col items-center gap-1 font-mono text-xs font-bold cursor-pointer transition-all ${
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
              <label className="block text-xs font-mono uppercase font-bold text-gray-400 mb-1">
                Transaction / Reference # (Optional)
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
            <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-mono rounded-xl">
              {error}
            </div>
          )}

          {/* Confirm Button */}
          <button
            type="button"
            onClick={handleFinish}
            disabled={isSubmitting}
            className="w-full py-4 ghost-btn-primary font-mono font-bold text-base rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>RECORDING...</span>
              </>
            ) : (
              <>
                <Check className="w-6 h-6" />
                <span>CONFIRM & CLOSE TV SESSION</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

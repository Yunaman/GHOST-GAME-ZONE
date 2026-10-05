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
  const extraTimeCount = session.matches?.filter(m => m.extra_time).length || 0;

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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#faf7f2] text-gray-900 rounded-t-2xl sm:rounded-xl shadow-2xl overflow-hidden border border-amber-200/80">
        {/* Paper Header */}
        <div className="bg-[#f0eae1] px-5 py-4 border-b border-[#e2ddd3] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
              FINISH & COLLECT
            </span>
            <h2 className="text-xl font-bold font-mono text-gray-900 mt-1">
              {session.console_name || 'TV'} SESSION SUMMARY
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Receipt Breakdown */}
          <div className="paper-receipt p-4 rounded-lg space-y-2 text-sm shadow-inner">
            <div className="flex justify-between text-gray-600 font-mono text-xs">
              <span>Game Type:</span>
              <span className="font-bold text-gray-800">FIFA (MATCH BASED)</span>
            </div>
            <div className="flex justify-between font-mono">
              <span>Total Completed Matches:</span>
              <span className="font-bold">{matchCount}</span>
            </div>
            <div className="flex justify-between font-mono">
              <span>Extra Time Matches (+5):</span>
              <span className="font-bold">{extraTimeCount}</span>
            </div>

            <div className="border-t border-dashed border-gray-300 pt-3 mt-3 flex justify-between items-baseline font-mono">
              <span className="font-bold text-base">TOTAL DUE:</span>
              <span className="text-2xl font-black text-emerald-700">
                {formatCurrency(session.total_amount, currency)}
              </span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-mono uppercase font-bold text-gray-600 mb-2">
              Select Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMethod('CASH')}
                className={`py-3 px-2 rounded-lg border flex flex-col items-center gap-1 font-mono text-xs font-bold transition-all ${
                  method === 'CASH'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-md scale-[1.02]'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Banknote className="w-5 h-5" />
                <span>CASH</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('TELEBIRR')}
                className={`py-3 px-2 rounded-lg border flex flex-col items-center gap-1 font-mono text-xs font-bold transition-all ${
                  method === 'TELEBIRR'
                    ? 'bg-blue-600 text-white border-blue-700 shadow-md scale-[1.02]'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span>TELEBIRR</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('CBE')}
                className={`py-3 px-2 rounded-lg border flex flex-col items-center gap-1 font-mono text-xs font-bold transition-all ${
                  method === 'CBE'
                    ? 'bg-purple-600 text-white border-purple-700 shadow-md scale-[1.02]'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
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
              <label className="block text-xs font-mono uppercase font-bold text-gray-600 mb-1">
                Transaction / Reference # (Optional)
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g., TXN-984214"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 font-mono text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-100 border border-rose-300 text-rose-800 text-xs font-mono rounded-lg">
              {error}
            </div>
          )}

          {/* Confirm Button */}
          <button
            type="button"
            onClick={handleFinish}
            disabled={isSubmitting}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-mono font-bold text-base rounded-xl shadow-lg flex items-center justify-center gap-2 tactile-button transition-all disabled:opacity-50"
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

'use client';

import { useState } from 'react';
import { createAdjustmentAction } from '@/app/actions';
import { Plus, Minus, Check, Loader2, ShieldAlert } from 'lucide-react';

interface AdjustmentFormProps {
  sessionId: string;
  currency: string;
}

export function AdjustmentForm({ sessionId, currency }: AdjustmentFormProps) {
  const [amount, setAmount] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (amount === 0) {
      setMessage({ type: 'error', text: 'Adjustment amount cannot be zero' });
      return;
    }
    if (!reason.trim()) {
      setMessage({ type: 'error', text: 'Please provide a reason for audit tracking' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await createAdjustmentAction(sessionId, amount, reason.trim(), 'Manager');
      if (res.success) {
        setMessage({ type: 'success', text: 'Audit adjustment recorded successfully' });
        setAmount(0);
        setReason('');
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to record adjustment' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="bg-[#f5f1e8] p-4 rounded-xl border border-[#e0dad0] space-y-3">
      <div className="flex items-center gap-2 text-gray-800 font-mono font-bold text-sm">
        <ShieldAlert className="w-4 h-4 text-amber-600" />
        <span>AUDIT CORRECTION / ADJUSTMENT</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 font-mono text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-gray-600 uppercase font-bold mb-1">
              Adjustment Amount ({currency})
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="1"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="e.g. -15 or 15"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <span className="text-[10px] text-gray-500">Use negative number to reduce total</span>
          </div>

          <div>
            <label className="block text-gray-600 uppercase font-bold mb-1">
              Audit Reason / Note
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Customer overcharged by 1 match"
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {message && (
          <div className={`p-2.5 rounded-lg text-xs ${
            message.type === 'success' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
          }`}>
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold rounded-lg flex items-center justify-center gap-2 tactile-button transition-colors disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          <span>Record Audit Adjustment</span>
        </button>
      </form>
    </div>
  );
}

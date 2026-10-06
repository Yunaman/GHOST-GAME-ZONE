import { repository } from '@/lib/repository';
import { formatCurrency } from '@/lib/utils';
import { AdjustmentForm } from '@/components/AdjustmentForm';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Tv, Calendar, Zap, CreditCard, Receipt, FileText } from 'lucide-react';

export const revalidate = 0;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SessionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await repository.getSessionById(id);
  const settings = await repository.getSettings();

  if (!session) {
    notFound();
  }

  const matches = session.matches || [];
  const payments = session.payments || [];
  const adjustments = session.adjustments || [];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/history"
          className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-gray-400 hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>BACK TO SESSION HISTORY</span>
        </Link>
      </div>

      <div className="ghost-glass-card p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 font-mono font-bold flex items-center justify-center text-xl shrink-0 border border-emerald-500/30">
              <Tv className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-mono font-bold text-white">
                  {session.console_name || 'TV'}
                </h1>
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-blue-950 text-blue-400 border border-blue-800">
                  {session.status}
                </span>
              </div>
              <p className="text-xs font-mono text-gray-400 mt-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-gray-500" />
                Started: {new Date(session.started_at).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right font-mono bg-gray-900/60 p-3 rounded-xl border border-gray-800">
            <div className="text-xs text-gray-400 uppercase font-bold">Total Recorded Revenue</div>
            <div className="text-3xl font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">
              {formatCurrency(session.total_amount, settings.currency)}
            </div>
          </div>
        </div>

        {/* Matches Breakdown */}
        <div className="space-y-3">
          <h2 className="font-mono font-bold text-sm text-gray-200 flex items-center gap-1.5 uppercase">
            <Receipt className="w-4 h-4 text-emerald-400" />
            <span>Matches Breakdown ({matches.length})</span>
          </h2>

          <div className="space-y-2">
            {matches.map((m) => (
              <div
                key={m.id}
                className="p-3 bg-gray-900/80 border border-gray-800 rounded-lg flex items-center justify-between font-mono text-xs"
              >
                <div>
                  <span className="font-bold text-white">MATCH #{m.match_number}</span>
                  <span className="ml-2 text-gray-400">Base: {m.base_price} {settings.currency}</span>
                  {m.extra_time && (
                    <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-700/60 font-bold inline-flex items-center gap-0.5">
                      <Zap className="w-3 h-3 fill-amber-400 text-amber-400" />
                      Extra Time (+{m.extra_time_price})
                    </span>
                  )}
                </div>

                <div className="font-bold text-emerald-400">
                  {m.total_price} {settings.currency}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payments */}
        {payments.length > 0 && (
          <div className="space-y-3 pt-3 border-t border-gray-800">
            <h2 className="font-mono font-bold text-sm text-gray-200 flex items-center gap-1.5 uppercase">
              <CreditCard className="w-4 h-4 text-blue-400" />
              <span>Payment Recorded</span>
            </h2>

            {payments.map((p) => (
              <div key={p.id} className="p-3 bg-blue-950/30 border border-blue-800/40 rounded-lg text-xs font-mono text-blue-300 flex justify-between">
                <div>
                  <span className="font-bold uppercase text-blue-200">{p.method}</span>
                  {p.reference && <span className="ml-2 text-blue-400">Ref: {p.reference}</span>}
                </div>
                <div className="font-bold">{formatCurrency(p.amount, settings.currency)}</div>
              </div>
            ))}
          </div>
        )}

        {/* Adjustments */}
        {adjustments.length > 0 && (
          <div className="space-y-3 pt-3 border-t border-gray-800">
            <h2 className="font-mono font-bold text-sm text-gray-200 flex items-center gap-1.5 uppercase">
              <FileText className="w-4 h-4 text-amber-400" />
              <span>Audit Adjustments History</span>
            </h2>

            {adjustments.map((a) => (
              <div key={a.id} className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-lg text-xs font-mono text-amber-300 space-y-1">
                <div className="flex justify-between font-bold">
                  <span>Reason: {a.reason}</span>
                  <span>
                    {a.adjustment_amount > 0 ? `+${a.adjustment_amount}` : a.adjustment_amount} {settings.currency}
                  </span>
                </div>
                <div className="text-[10px] text-amber-400/80 flex justify-between">
                  <span>Recorded by: {a.created_by}</span>
                  <span>{new Date(a.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Audit Form */}
        <div className="pt-4 border-t border-gray-800">
          <AdjustmentForm sessionId={session.id} currency={settings.currency} />
        </div>
      </div>
    </div>
  );
}

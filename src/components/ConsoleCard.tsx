'use client';

import { useState } from 'react';
import { Console, Session, Settings } from '@/types';
import {
  startSessionAction,
  addMatchAction,
  toggleMatchExtraTimeAction,
  undoLastMatchAction,
} from '@/app/actions';
import { formatCurrency, cryptoRandomUUID } from '@/lib/utils';
import { FinishSessionModal } from '@/components/FinishSessionModal';
import {
  Plus,
  Play,
  RotateCcw,
  CheckCircle2,
  Tv,
  Zap,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface ConsoleCardProps {
  consoleState: {
    console: Console;
    active_session?: Session | null;
  };
  settings: Settings;
}

export function ConsoleCard({ consoleState, settings }: ConsoleCardProps) {
  const { console: tv, active_session: session } = consoleState;
  const isPlaying = tv.status === 'PLAYING' && !!session;

  const [isLoading, setIsLoading] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showMatchList, setShowMatchList] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const matches = session?.matches || [];
  const matchCount = matches.length;
  const currency = settings?.currency || 'ETB';

  async function handleStartSession() {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await startSessionAction(tv.id);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to start session');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error starting session');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddMatch() {
    if (!session) return;
    setIsLoading(true);
    setErrorMsg(null);
    const key = cryptoRandomUUID();
    try {
      const res = await addMatchAction(session.id, key);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to add match');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error adding match');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleToggleExtraTime(matchId: string) {
    if (!session) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await toggleMatchExtraTimeAction(session.id, matchId);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to toggle extra time');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error toggling extra time');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUndoLastMatch() {
    if (!session) return;
    if (!confirm('Undo/Remove the last recorded match?')) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await undoLastMatchAction(session.id);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to undo match');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error undoing match');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className={`paper-card paper-card-tape overflow-hidden transition-all duration-200 ${
        isPlaying ? 'border-emerald-600/40' : 'border-gray-200'
      }`}>
        {/* TV Header Bar */}
        <div className={`px-4 py-3 flex items-center justify-between border-b ${
          isPlaying ? 'bg-[#f0fdf4] border-emerald-200' : 'bg-[#f7f5f0] border-[#e8e3d8]'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
              isPlaying ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-300 text-gray-700'
            }`}>
              <Tv className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-mono font-bold text-lg text-gray-900 leading-none">
                {tv.name}
              </h2>
              <span className="text-[10px] font-mono text-gray-500 uppercase">
                FIFA 24 / CONSOLE
              </span>
            </div>
          </div>

          {/* Status Badge */}
          <div>
            {isPlaying ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                PLAYING
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-gray-200 text-gray-700 border border-gray-300">
                <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                AVAILABLE
              </span>
            )}
          </div>
        </div>

        {/* TV Body */}
        <div className="p-4">
          {errorMsg && (
            <div className="mb-3 p-2.5 bg-rose-100 border border-rose-300 text-rose-800 text-xs font-mono rounded-lg flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!isPlaying ? (
            /* AVAILABLE STATE UI */
            <div className="py-6 text-center space-y-4">
              <div className="text-gray-500 text-xs font-mono">
                No active session on this TV. Ready for customers.
              </div>
              <button
                onClick={handleStartSession}
                disabled={isLoading}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-mono font-bold text-base rounded-xl shadow-md flex items-center justify-center gap-2 tactile-button transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" />
                    <span>START FIFA SESSION</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* PLAYING STATE UI */
            <div className="space-y-4">
              {/* Total Banner */}
              <div className="bg-[#181b22] text-white p-3.5 rounded-xl border border-gray-800 flex items-center justify-between shadow-inner">
                <div>
                  <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                    Completed Matches
                  </div>
                  <div className="text-2xl font-mono font-black text-emerald-400 flex items-baseline gap-1">
                    <span>{matchCount}</span>
                    <span className="text-xs font-normal text-gray-400">matches</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                    Current Total
                  </div>
                  <div className="text-2xl font-mono font-black text-emerald-400">
                    {formatCurrency(session.total_amount, currency)}
                  </div>
                </div>
              </div>

              {/* PRIMARY ACTION: DOMINANT "+ MATCH" BUTTON */}
              <button
                onClick={handleAddMatch}
                disabled={isLoading}
                className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-mono font-black text-xl rounded-2xl shadow-xl flex items-center justify-center gap-3 tactile-button border-2 border-emerald-400/50 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                      <Plus className="w-6 h-6 stroke-[3]" />
                    </div>
                    <span>+ MATCH ({settings.fifa_normal_price} {currency})</span>
                  </>
                )}
              </button>

              {/* MATCH LIST BREAKDOWN */}
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={() => setShowMatchList(!showMatchList)}
                  className="w-full px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between text-xs font-mono font-bold text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <span>MATCH LOG ({matchCount})</span>
                  <div className="flex items-center gap-1 text-gray-500">
                    {showMatchList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {showMatchList && (
                  <div className="p-2 space-y-2 max-h-56 overflow-y-auto">
                    {matches.length === 0 ? (
                      <div className="py-4 text-center text-xs font-mono text-gray-400 italic">
                        0 matches played yet. Tap "+ MATCH" when match finishes.
                      </div>
                    ) : (
                      matches.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-200 text-xs font-mono"
                        >
                          <div>
                            <span className="font-bold text-gray-800">
                              MATCH {m.match_number}
                            </span>
                            {m.extra_time && (
                              <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 border border-amber-300 font-semibold inline-flex items-center gap-0.5">
                                <Zap className="w-3 h-3 fill-amber-500 text-amber-500" />
                                Extra Time (+{m.extra_time_price})
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">
                              {m.total_price} {currency}
                            </span>

                            {/* EXTRA TIME BUTTON */}
                            <button
                              type="button"
                              onClick={() => handleToggleExtraTime(m.id)}
                              disabled={isLoading}
                              className={`px-2 py-1 rounded text-[11px] font-bold transition-all ${
                                m.extra_time
                                  ? 'bg-amber-500 text-white border border-amber-600 shadow-sm'
                                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300'
                              }`}
                              title={m.extra_time ? 'Remove Extra Time' : 'Add Extra Time (+5 ETB)'}
                            >
                              {m.extra_time ? 'EXTRA TIME ✓' : '+ EXTRA TIME (+5)'}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* SECONDARY ACTIONS: UNDO & FINISH */}
              <div className="pt-2 flex items-center justify-between gap-2 border-t border-gray-200">
                {matchCount > 0 && (
                  <button
                    type="button"
                    onClick={handleUndoLastMatch}
                    disabled={isLoading}
                    className="px-3 py-2 bg-gray-100 hover:bg-rose-50 text-gray-600 hover:text-rose-700 border border-gray-300 hover:border-rose-300 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Undo Last</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowFinishModal(true)}
                  disabled={isLoading}
                  className="ml-auto px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-mono font-bold text-sm rounded-xl shadow flex items-center gap-1.5 tactile-button transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>FINISH SESSION</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FINISH MODAL */}
      {showFinishModal && session && (
        <FinishSessionModal
          session={session}
          currency={currency}
          onClose={() => setShowFinishModal(false)}
        />
      )}
    </>
  );
}

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
  AlertCircle,
  Gamepad2
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
    if (!confirm('Undo / remove the last recorded match?')) return;
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
      <div className={`ghost-glass-card overflow-hidden transition-all duration-300 ${
        isPlaying ? 'border-emerald-500/40 shadow-emerald-950/20' : 'border-gray-800'
      }`}>
        {/* TV Card Header */}
        <div className={`px-4 py-3 flex items-center justify-between border-b ${
          isPlaying ? 'bg-emerald-950/30 border-emerald-800/40' : 'bg-gray-900/40 border-gray-800/60'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
              isPlaying ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/30' : 'bg-gray-800 text-gray-400'
            }`}>
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-mono font-black text-lg text-white tracking-wide">
                {tv.name}
              </h2>
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <Gamepad2 className="w-3 h-3 text-emerald-400" /> FIFA ZONE
              </span>
            </div>
          </div>

          {/* Status Badge */}
          <div>
            {isPlaying ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                PLAYING
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-gray-800/80 text-gray-400 border border-gray-700">
                <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                AVAILABLE
              </span>
            )}
          </div>
        </div>

        {/* TV Card Body */}
        <div className="p-4 sm:p-5">
          {errorMsg && (
            <div className="mb-3 p-3 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-mono rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!isPlaying ? (
            /* AVAILABLE STATE UI */
            <div className="py-8 text-center space-y-4">
              <div className="text-gray-400 text-xs font-mono uppercase tracking-widest">
                STATION READY FOR PLAYERS
              </div>
              <button
                onClick={handleStartSession}
                disabled={isLoading}
                className="w-full py-4 ghost-btn-primary font-mono font-bold text-base rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
              {/* Real-Time Total Banner */}
              <div className="bg-[#0d1017] p-4 rounded-xl border border-emerald-500/20 flex items-center justify-between shadow-inner">
                <div>
                  <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
                    MATCHES PLAYED
                  </div>
                  <div className="text-3xl font-mono font-black text-white flex items-baseline gap-1">
                    <span>{matchCount}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
                    CURRENT TOTAL
                  </div>
                  <div className="text-3xl font-mono font-black text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                    {formatCurrency(session.total_amount, currency)}
                  </div>
                </div>
              </div>

              {/* DOMINANT GIANT + MATCH BUTTON */}
              <button
                onClick={handleAddMatch}
                disabled={isLoading}
                className="w-full py-5 ghost-btn-primary font-mono font-black text-xl rounded-2xl flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 border-2 border-emerald-300/30"
              >
                {isLoading ? (
                  <Loader2 className="w-7 h-7 animate-spin" />
                ) : (
                  <>
                    <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                      <Plus className="w-6 h-6 stroke-[3]" />
                    </div>
                    <span>+ MATCH ({settings.fifa_normal_price} {currency})</span>
                  </>
                )}
              </button>

              {/* MATCH BREAKDOWN LOG */}
              <div className="border border-gray-800 rounded-xl overflow-hidden bg-[#0a0d13]/80">
                <button
                  type="button"
                  onClick={() => setShowMatchList(!showMatchList)}
                  className="w-full px-3.5 py-2.5 bg-gray-900/60 border-b border-gray-800 flex items-center justify-between text-xs font-mono font-bold text-gray-300 hover:bg-gray-800/60 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <span>SESSION MATCH LOG</span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px]">
                      {matchCount}
                    </span>
                  </span>
                  <div>
                    {showMatchList ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>

                {showMatchList && (
                  <div className="p-2.5 space-y-2 max-h-56 overflow-y-auto">
                    {matches.length === 0 ? (
                      <div className="py-4 text-center text-xs font-mono text-gray-500 italic">
                        0 matches recorded yet. Tap "+ MATCH" when a game ends.
                      </div>
                    ) : (
                      matches.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-gray-900/80 border border-gray-800 text-xs font-mono"
                        >
                          <div>
                            <span className="font-bold text-white">
                              MATCH {m.match_number}
                            </span>
                            {m.extra_time && (
                              <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-amber-950/80 text-amber-300 border border-amber-700/60 font-semibold inline-flex items-center gap-1">
                                <Zap className="w-3 h-3 fill-amber-400 text-amber-400" />
                                Extra Time (+{m.extra_time_price})
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-bold text-emerald-400">
                              {m.total_price} {currency}
                            </span>

                            {/* EXTRA TIME TOGGLE */}
                            <button
                              type="button"
                              onClick={() => handleToggleExtraTime(m.id)}
                              disabled={isLoading}
                              className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-all ${
                                m.extra_time
                                  ? 'bg-amber-600 text-white border border-amber-500 shadow-sm'
                                  : 'bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-800/60'
                              }`}
                              title={m.extra_time ? 'Remove Extra Time' : 'Add Extra Time (+5 ETB)'}
                            >
                              {m.extra_time ? 'EXTRA TIME ✓' : '+ EXTRA (+5)'}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* SECONDARY ACTIONS: UNDO & FINISH */}
              <div className="pt-2 flex items-center justify-between gap-2 border-t border-gray-800">
                {matchCount > 0 && (
                  <button
                    type="button"
                    onClick={handleUndoLastMatch}
                    disabled={isLoading}
                    className="px-3 py-2 bg-gray-900 hover:bg-rose-950/40 text-gray-400 hover:text-rose-300 border border-gray-800 hover:border-rose-800/60 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Undo Last</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowFinishModal(true)}
                  disabled={isLoading}
                  className="ml-auto px-4 py-2.5 ghost-btn-danger font-mono font-bold text-sm rounded-xl flex items-center gap-1.5 cursor-pointer"
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

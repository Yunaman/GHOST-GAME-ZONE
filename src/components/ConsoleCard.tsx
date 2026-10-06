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
      <div>
        <div className={`paper-card overflow-hidden transition-all duration-300 ${
          isPlaying ? 'border-purple-500/60 shadow-[0_0_20px_rgba(168,85,247,0.25)]' : 'border-zinc-800'
        }`}>
          {/* TV Card Header */}
          <div className={`px-4 py-3.5 flex items-center justify-between border-b ${
            isPlaying ? 'bg-purple-950/40 border-purple-800/50' : 'bg-black/40 border-zinc-800'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                isPlaying ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/40' : 'bg-zinc-800 text-zinc-400'
              }`}>
                <Tv className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-gaming font-black text-lg text-white tracking-wide flex items-center gap-1.5">
                  <span>{tv.name}</span>
                  <span className="text-xs text-purple-400">👻</span>
                </h2>
                <span className="font-handwriting text-purple-300 text-base leading-none block">
                  FIFA gaming station
                </span>
              </div>
            </div>

            {/* Status Badge */}
            <div>
              {isPlaying ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-gaming font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                  PLAYING
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-gaming font-semibold bg-zinc-800/80 text-zinc-400 border border-zinc-700">
                  <span className="w-2 h-2 rounded-full bg-zinc-500"></span>
                  AVAILABLE
                </span>
              )}
            </div>
          </div>

          {/* TV Card Body */}
          <div className="p-4 sm:p-5">
            {errorMsg && (
              <div className="mb-3 p-3 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-sans rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {!isPlaying ? (
              /* AVAILABLE STATE UI */
              <div className="py-8 text-center space-y-4">
                <div className="font-handwriting text-zinc-300 text-xl">
                  Station ready for players 👻
                </div>
                <button
                  type="button"
                  onClick={handleStartSession}
                  disabled={isLoading}
                  className="w-full py-4 ghost-btn-primary font-gaming font-black text-base rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Play className="w-5 h-5 fill-current" />
                      <span className="tracking-wide font-black">START FIFA SESSION 👻</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* PLAYING STATE UI */
              <div className="space-y-4">
                {/* Real-Time Total Banner */}
                <div className="bg-black/70 p-4 rounded-xl border border-purple-900/50 flex items-center justify-between shadow-inner">
                  <div>
                    <div className="font-handwriting text-zinc-400 text-base leading-none">
                      matches completed
                    </div>
                    <div className="text-3xl font-gaming font-black text-white mt-1">
                      {matchCount}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-handwriting text-purple-300 text-base leading-none">
                      current total
                    </div>
                    <div className="text-3xl font-gaming font-black text-purple-300 drop-shadow-[0_0_12px_rgba(168,85,247,0.4)] mt-1">
                      {formatCurrency(session.total_amount, currency)}
                    </div>
                  </div>
                </div>

                {/* DOMINANT HIGH-CONTRAST +MATCH BUTTON */}
                <button
                  type="button"
                  onClick={handleAddMatch}
                  disabled={isLoading}
                  className="w-full py-5 paper-btn-match font-gaming text-xl flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-7 h-7 animate-spin" />
                  ) : (
                    <>
                      <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-bold">
                        <Plus className="w-6 h-6 stroke-[3]" />
                      </div>
                      <span>+ MATCH ({settings.fifa_normal_price} {currency}) 👻</span>
                    </>
                  )}
                </button>

                {/* MATCH BREAKDOWN LOG */}
                <div className="border border-purple-900/40 rounded-xl overflow-hidden bg-black/60">
                  <button
                    type="button"
                    onClick={() => setShowMatchList(!showMatchList)}
                    className="w-full px-3.5 py-2.5 bg-purple-950/30 border-b border-purple-900/40 flex items-center justify-between text-xs font-gaming font-bold text-zinc-200 hover:bg-purple-900/30 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <span>SESSION MATCH LOG</span>
                      <span className="px-2 py-0.5 rounded bg-purple-900/80 text-purple-200 border border-purple-700/60 text-[10px] font-mono font-bold">
                        {matchCount}
                      </span>
                    </span>
                    <div>
                      {showMatchList ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                    </div>
                  </button>

                  {showMatchList && (
                    <div className="p-2.5 space-y-2 max-h-56 overflow-y-auto">
                      {matches.length === 0 ? (
                        <div className="py-4 text-center font-handwriting text-base text-zinc-400">
                          0 matches recorded. Tap "+ MATCH" when a match ends.
                        </div>
                      ) : (
                        matches.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between p-2.5 rounded-lg bg-black/80 border border-purple-900/30 text-xs"
                          >
                            <div>
                              <span className="font-gaming font-bold text-white text-sm">
                                MATCH {m.match_number}
                              </span>
                              {m.extra_time && (
                                <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-amber-950/80 text-amber-300 border border-amber-600/80 font-bold inline-flex items-center gap-1 font-mono">
                                  <Zap className="w-3 h-3 fill-amber-400 text-amber-400" />
                                  Extra Time (+{m.extra_time_price})
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="font-gaming font-bold text-purple-300 text-sm">
                                {m.total_price} {currency}
                              </span>

                              {/* EXTRA TIME TOGGLE */}
                              <button
                                type="button"
                                onClick={() => handleToggleExtraTime(m.id)}
                                disabled={isLoading}
                                className={`px-2.5 py-1 rounded text-[11px] font-sans font-bold cursor-pointer transition-all ${
                                  m.extra_time
                                    ? 'bg-amber-600 text-white border border-amber-400 shadow-sm'
                                    : 'paper-btn-extra'
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
                <div className="pt-2 flex items-center justify-between gap-2 border-t border-purple-900/40">
                  {matchCount > 0 && (
                    <button
                      type="button"
                      onClick={handleUndoLastMatch}
                      disabled={isLoading}
                      className="px-3 py-2 bg-zinc-900 hover:bg-rose-950/60 text-zinc-300 hover:text-rose-300 border border-zinc-800 hover:border-rose-800 rounded-lg text-xs font-sans font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Undo Last</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowFinishModal(true)}
                    disabled={isLoading}
                    className="ml-auto px-4 py-2.5 ghost-btn-danger font-gaming font-black text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>FINISH SESSION</span>
                  </button>
                </div>
              </div>
            )}
          </div>
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

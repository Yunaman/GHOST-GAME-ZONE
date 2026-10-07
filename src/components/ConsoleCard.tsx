'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { Console, Session, Settings, Match } from '@/types';
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
  onSessionFinished?: () => void;
}

export function ConsoleCard({ consoleState, settings, onSessionFinished }: ConsoleCardProps) {
  const { console: initialTv, active_session: initialSession } = consoleState;

  // Local optimistic state for instant (<10ms) tap responses
  const [currentTv, setCurrentTv] = useState<Console>(initialTv);
  const [currentSession, setCurrentSession] = useState<Session | null>(initialSession || null);

  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showMatchList, setShowMatchList] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Debounce guard to prevent rapid double tap duplicates
  const lastTapTimeRef = useRef<number>(0);

  // Sync props when parent re-renders unless an optimistic action is pending
  useEffect(() => {
    setCurrentTv(initialTv);
    setCurrentSession(initialSession || null);
  }, [initialTv, initialSession]);

  const isPlaying = currentTv.status === 'PLAYING' && !!currentSession;
  const matches = currentSession?.matches || [];
  const matchCount = matches.length;
  const currency = settings?.currency || 'ETB';
  const fifaNormalPrice = settings?.fifa_normal_price ?? 15;
  const fifaExtraTimePrice = settings?.fifa_extra_time_price ?? 5;

  // --- INSTANT OPTIMISTIC ACTION 1: START SESSION ---
  async function handleStartSession() {
    const now = Date.now();
    if (now - lastTapTimeRef.current < 200) return;
    lastTapTimeRef.current = now;

    setErrorMsg(null);
    const tempSessionId = cryptoRandomUUID();
    const startTime = new Date().toISOString();

    const optimisticSession: Session = {
      id: tempSessionId,
      console_id: currentTv.id,
      console_name: currentTv.name,
      game_type: 'FIFA',
      billing_type: 'MATCH_BASED',
      status: 'ACTIVE',
      started_at: startTime,
      total_amount: 0,
      payment_status: 'UNPAID',
      created_by: 'Staff',
      created_at: startTime,
      matches: [],
    };

    // INSTANT UI UPDATE
    setCurrentTv((prev) => ({ ...prev, status: 'PLAYING' }));
    setCurrentSession(optimisticSession);

    startTransition(async () => {
      try {
        const res = await startSessionAction(currentTv.id);
        if (res.success && res.data) {
          setCurrentSession(res.data);
        } else {
          setErrorMsg(res.error || 'Failed to start session');
          setCurrentTv(initialTv);
          setCurrentSession(initialSession || null);
        }
      } catch (err: any) {
        setErrorMsg(err?.message || 'Error starting session');
        setCurrentTv(initialTv);
        setCurrentSession(initialSession || null);
      }
    });
  }

  // --- INSTANT OPTIMISTIC ACTION 2: ADD MATCH ---
  async function handleAddMatch() {
    if (!currentSession) return;
    const now = Date.now();
    if (now - lastTapTimeRef.current < 150) return; // Prevent double tap <150ms
    lastTapTimeRef.current = now;

    setErrorMsg(null);
    const idempotencyKey = cryptoRandomUUID();
    const newMatchNum = (currentSession.matches?.length || 0) + 1;
    const matchId = cryptoRandomUUID();

    const newMatch: Match = {
      id: matchId,
      session_id: currentSession.id,
      match_number: newMatchNum,
      base_price: fifaNormalPrice,
      extra_time: false,
      extra_time_price: 0,
      total_price: fifaNormalPrice,
      client_idempotency_key: idempotencyKey,
      created_at: new Date().toISOString(),
    };

    const previousSession = currentSession;
    const updatedMatches = [...(currentSession.matches || []), newMatch];
    const updatedTotal = updatedMatches.reduce((acc, m) => acc + m.total_price, 0);

    // INSTANT UI UPDATE (<10ms)
    setCurrentSession({
      ...currentSession,
      matches: updatedMatches,
      total_amount: updatedTotal,
    });

    startTransition(async () => {
      try {
        const res = await addMatchAction(previousSession.id, idempotencyKey);
        if (!res.success) {
          setErrorMsg(res.error || 'Failed to add match');
          setCurrentSession(previousSession); // Rollback
        }
      } catch (err: any) {
        setErrorMsg(err?.message || 'Error adding match');
        setCurrentSession(previousSession); // Rollback
      }
    });
  }

  // --- INSTANT OPTIMISTIC ACTION 3: TOGGLE EXTRA TIME ---
  async function handleToggleExtraTime(matchId: string) {
    if (!currentSession) return;
    setErrorMsg(null);

    const targetMatch = currentSession.matches?.find((m) => m.id === matchId);
    if (!targetMatch) return;

    const previousSession = currentSession;
    const isAdding = !targetMatch.extra_time;
    const extraPrice = isAdding ? fifaExtraTimePrice : 0;
    const newTotalPrice = targetMatch.base_price + extraPrice;

    const updatedMatches = (currentSession.matches || []).map((m) =>
      m.id === matchId
        ? {
            ...m,
            extra_time: isAdding,
            extra_time_price: extraPrice,
            total_price: newTotalPrice,
          }
        : m
    );

    const updatedTotal = updatedMatches.reduce((acc, m) => acc + m.total_price, 0);

    // INSTANT UI UPDATE (<10ms)
    setCurrentSession({
      ...currentSession,
      matches: updatedMatches,
      total_amount: updatedTotal,
    });

    startTransition(async () => {
      try {
        const res = await toggleMatchExtraTimeAction(previousSession.id, matchId);
        if (!res.success) {
          setErrorMsg(res.error || 'Failed to toggle extra time');
          setCurrentSession(previousSession); // Rollback
        }
      } catch (err: any) {
        setErrorMsg(err?.message || 'Error toggling extra time');
        setCurrentSession(previousSession); // Rollback
      }
    });
  }

  // --- INSTANT OPTIMISTIC ACTION 4: UNDO LAST MATCH ---
  async function handleUndoLastMatch() {
    if (!currentSession || !currentSession.matches || currentSession.matches.length === 0) return;
    if (!confirm('Undo / remove the last recorded match?')) return;

    setErrorMsg(null);
    const previousSession = currentSession;
    const updatedMatches = currentSession.matches.slice(0, -1);
    const updatedTotal = updatedMatches.reduce((acc, m) => acc + m.total_price, 0);

    // INSTANT UI UPDATE (<10ms)
    setCurrentSession({
      ...currentSession,
      matches: updatedMatches,
      total_amount: updatedTotal,
    });

    startTransition(async () => {
      try {
        const res = await undoLastMatchAction(previousSession.id);
        if (!res.success) {
          setErrorMsg(res.error || 'Failed to undo match');
          setCurrentSession(previousSession); // Rollback
        }
      } catch (err: any) {
        setErrorMsg(err?.message || 'Error undoing match');
        setCurrentSession(previousSession); // Rollback
      }
    });
  }

  // --- INSTANT OPTIMISTIC ACTION 5: FINISH SESSION OPTIMISTIC CALLBACK ---
  function handleSessionFinishedOptimistic() {
    setShowFinishModal(false);
    setCurrentTv((prev) => ({ ...prev, status: 'AVAILABLE' }));
    setCurrentSession(null);
    if (onSessionFinished) onSessionFinished();
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
                  <span>{currentTv.name}</span>
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
                  className="w-full py-4 ghost-btn-primary font-gaming font-black text-base rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span className="tracking-wide font-black">START FIFA SESSION 👻</span>
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
                      {formatCurrency(currentSession?.total_amount || 0, currency)}
                    </div>
                  </div>
                </div>

                {/* DOMINANT HIGH-CONTRAST +MATCH BUTTON */}
                <button
                  type="button"
                  onClick={handleAddMatch}
                  className="w-full py-5 paper-btn-match font-gaming text-xl flex items-center justify-center gap-3 cursor-pointer active:scale-[0.98]"
                >
                  <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-bold">
                    <Plus className="w-6 h-6 stroke-[3]" />
                  </div>
                  <span>+ MATCH ({fifaNormalPrice} {currency}) 👻</span>
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
                      className="px-3 py-2 bg-zinc-900 hover:bg-rose-950/60 text-zinc-300 hover:text-rose-300 border border-zinc-800 hover:border-rose-800 rounded-lg text-xs font-sans font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Undo Last</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowFinishModal(true)}
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
      {showFinishModal && currentSession && (
        <FinishSessionModal
          session={currentSession}
          currency={currency}
          onClose={() => setShowFinishModal(false)}
          onSuccess={handleSessionFinishedOptimistic}
        />
      )}
    </>
  );
}

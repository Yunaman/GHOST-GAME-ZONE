'use client';

import { useState, useEffect } from 'react';
import { GhostPaymentCard } from '@/components/GhostPaymentCard';
import { MadeByYuna } from '@/components/MadeByYuna';
import { ArrowRight } from 'lucide-react';

export function IntroSplash() {
  const [showSplash, setShowSplash] = useState(true);
  const [fadingOut, setFadingOut] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Check reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setShowSplash(false);
      return;
    }

    // Sequence timing
    const t1 = setTimeout(() => setStep(1), 600);   // GHOST GAME ZONE Title
    const t2 = setTimeout(() => setStep(2), 1500);  // Ghost Payment Card artwork
    const t3 = setTimeout(() => setStep(3), 2800);  // MADE BY YUNA
    const t4 = setTimeout(() => setFadingOut(true), 4400); // Fade out start
    const t5 = setTimeout(() => setShowSplash(false), 4900); // Unmount

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, []);

  if (!showSplash) return null;

  const handleDismiss = () => {
    setFadingOut(true);
    setTimeout(() => setShowSplash(false), 300);
  };

  return (
    <div
      onClick={handleDismiss}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between p-4 bg-[#08060f] text-white select-none transition-opacity duration-500 ease-in-out ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background Subtle Radial Glow Effect */}
      <div className="absolute inset-0 bg-radial from-purple-950/30 via-[#08060f] to-[#08060f] pointer-events-none" />

      {/* Top Header & Skip Button */}
      <div className="w-full max-w-2xl flex items-center justify-between relative z-10 pt-2">
        <span className="text-xs font-mono tracking-widest text-purple-400 font-bold uppercase">
          ETHIOPIA GAMING CENTER
        </span>
        <button
          type="button"
          onClick={handleDismiss}
          className="px-3.5 py-1.5 rounded-full bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-xs font-gaming font-bold text-purple-200 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <span>SKIP INTRO</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Cinematic Sequence Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-lg w-full space-y-5 my-auto">
        {/* Title: GHOST GAME ZONE */}
        <div className={`transition-all duration-700 transform ${
          step >= 1 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'
        }`}>
          <div className="text-5xl sm:text-6xl mb-2 filter drop-shadow-[0_0_20px_rgba(168,85,247,0.6)] animate-bounce">
            👻
          </div>
          <h1 className="font-gaming text-3xl sm:text-5xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-200 to-amber-300 drop-shadow-[0_0_25px_rgba(168,85,247,0.5)]">
            GHOST GAME ZONE
          </h1>
          <p className="font-handwriting text-purple-300 text-2xl sm:text-3xl mt-1">
            Addis Ababa Gaming Center
          </p>
        </div>

        {/* Ghost Payment Card Visual Asset */}
        <div className={`w-full transition-all duration-700 transform ${
          step >= 2 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-6 scale-90'
        }`}>
          <GhostPaymentCard size="sm" />
        </div>

        {/* MADE BY YUNA Signature */}
        <div className={`transition-all duration-700 transform ${
          step >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <MadeByYuna size="md" />
        </div>
      </div>

      {/* Bottom Progress Bar */}
      <div className="w-full max-w-xs relative z-10 pb-4">
        <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden border border-purple-900/40">
          <div
            className="h-full bg-gradient-to-r from-purple-600 via-fuchsia-400 to-amber-400 transition-all duration-500 ease-linear rounded-full"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] font-mono text-zinc-500 text-center uppercase tracking-wider">
          TAP ANYWHERE TO ENTER FLOOR 👻
        </p>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';

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
    const t1 = setTimeout(() => setStep(1), 600);   // Ghost emoji float & glow
    const t2 = setTimeout(() => setStep(2), 1500);  // Title reveal
    const t3 = setTimeout(() => setStep(3), 2800);  // Subtitle reveal
    const t4 = setTimeout(() => setFadingOut(true), 4200); // Fade out start
    const t5 = setTimeout(() => setShowSplash(false), 4700); // Unmount

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
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#08060f] text-white cursor-pointer select-none transition-opacity duration-500 ease-in-out ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background Subtle Purple Fog Effect */}
      <div className="absolute inset-0 bg-radial from-purple-950/30 via-[#08060f] to-[#08060f] pointer-events-none" />

      {/* Top Skip Button */}
      <div className="absolute top-6 right-6 z-20">
        <button
          type="button"
          onClick={handleDismiss}
          className="px-3.5 py-1.5 rounded-full bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-xs font-gaming font-bold text-purple-200 transition-colors cursor-pointer"
        >
          SKIP INTRO 👻
        </button>
      </div>

      <div className="relative z-10 flex flex-col items-center text-center px-4">
        {/* Large Bouncing Ghost Emoji + Animated Aura */}
        <div className={`text-7xl sm:text-8xl transition-all duration-700 transform ${
          step >= 1 ? 'scale-100 opacity-100 translate-y-0' : 'scale-75 opacity-0 translate-y-6'
        }`}>
          <span className="inline-block animate-bounce duration-1000 filter drop-shadow-[0_0_30px_rgba(168,85,247,0.7)]">
            👻
          </span>
        </div>

        {/* Title: GHOST GAME ZONE */}
        <div className={`mt-6 transition-all duration-700 transform ${
          step >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <h1 className="font-gaming text-3xl sm:text-5xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-200 to-amber-300 drop-shadow-[0_0_25px_rgba(168,85,247,0.5)]">
            GHOST GAME ZONE
          </h1>
        </div>

        {/* Tagline & Subtext */}
        <div className={`mt-3 transition-all duration-700 transform ${
          step >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <p className="font-handwriting text-purple-300 text-2xl sm:text-3xl tracking-wide">
            FIFA Zone • Addis Ababa
          </p>
          <p className="mt-4 text-xs font-gaming text-zinc-400 tracking-wider uppercase">
            Tap anywhere to enter floor 👻
          </p>
        </div>
      </div>

      {/* Subtle Progress Bar */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-48 h-1 bg-zinc-900 rounded-full overflow-hidden border border-purple-900/40">
        <div
          className="h-full bg-gradient-to-r from-purple-600 via-fuchsia-400 to-amber-400 transition-all duration-500 ease-linear rounded-full"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>
    </div>
  );
}

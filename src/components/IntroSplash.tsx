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
    const t1 = setTimeout(() => setStep(1), 800);   // Fog & glow
    const t2 = setTimeout(() => setStep(2), 1800);  // 3D Ghost title
    const t3 = setTimeout(() => setStep(3), 3200);  // Full branding tag
    const t4 = setTimeout(() => setFadingOut(true), 4500); // Fade out start
    const t5 = setTimeout(() => setShowSplash(false), 5100); // Unmount

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, []);

  if (!showSplash) return null;

  return (
    <div
      onClick={() => {
        setFadingOut(true);
        setTimeout(() => setShowSplash(false), 300);
      }}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#040508] text-white cursor-pointer select-none transition-opacity duration-700 ease-in-out ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background Subtle Fog Effect */}
      <div className="absolute inset-0 bg-radial from-emerald-950/20 via-[#040508] to-[#040508] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center px-4">
        {/* Large Ghost Emoji + Animated Aura */}
        <div className={`text-7xl sm:text-8xl transition-all duration-1000 transform ${
          step >= 1 ? 'scale-100 opacity-100 translate-y-0' : 'scale-75 opacity-0 translate-y-6'
        }`}>
          <span className="inline-block animate-bounce duration-1000 filter drop-shadow-[0_0_25px_rgba(16,185,129,0.5)]">
            👻
          </span>
        </div>

        {/* Title: GHOST GAME ZONE */}
        <div className={`mt-6 transition-all duration-1000 transform ${
          step >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <h1 className="font-gaming text-3xl sm:text-5xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-200 to-emerald-500 drop-shadow-[0_0_20px_rgba(16,185,129,0.4)]">
            GHOST GAME ZONE
          </h1>
        </div>

        {/* Tagline & Subtext */}
        <div className={`mt-3 transition-all duration-1000 transform ${
          step >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <p className="font-handwriting text-emerald-400 text-2xl sm:text-3xl tracking-wide">
            FIFA Zone • Addis Ababa
          </p>
          <p className="mt-4 text-xs font-gaming text-gray-500 tracking-wider uppercase">
            Tap anywhere to enter floor
          </p>
        </div>
      </div>

      {/* Subtle Progress Bar */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-48 h-1 bg-gray-900 rounded-full overflow-hidden border border-emerald-900/30">
        <div
          className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 transition-all duration-500 ease-linear rounded-full"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>
    </div>
  );
}

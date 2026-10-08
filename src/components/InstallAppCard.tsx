'use client';

import { useEffect, useState } from 'react';
import { Download, X, CheckCircle2 } from 'lucide-react';

export function InstallAppCard() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    // Check if already dismissed
    const dismissed = localStorage.getItem('ghost_install_dismissed');
    if (dismissed === 'true') {
      return;
    }

    // Check standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
      return;
    }

    // Show card post intro splash (~4.8 seconds after mount)
    const showTimer = setTimeout(() => {
      setIsVisible(true);
    }, 4800);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsVisible(false);
      setInstallSuccess(true);
      setTimeout(() => setInstallSuccess(false), 4000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      clearTimeout(showTimer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('ghost_install_dismissed', 'true');
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert(
        "To install Ghost Game Zone:\n\n• Chrome/Android: Tap browser menu (⋮) -> 'Install app' or 'Add to Home screen'\n• iPhone/Safari: Tap Share (↑) -> 'Add to Home Screen'\n• Desktop: Click install icon in your address bar."
      );
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setIsVisible(false);
      localStorage.setItem('ghost_install_dismissed', 'true');
    }
    setDeferredPrompt(null);
  };

  if (isInstalled && installSuccess) {
    return (
      <div className="fixed bottom-4 right-4 z-50 p-3 bg-emerald-950/90 border border-emerald-700 text-emerald-300 rounded-2xl shadow-2xl flex items-center gap-2 font-gaming text-xs font-bold animate-fade-in">
        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        <span>GHOST GAME ZONE INSTALLED! 👻</span>
      </div>
    );
  }

  if (!isVisible || isInstalled) return null;

  return (
    <div className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-50 animate-bounce-in pointer-events-auto">
      <div className="relative bg-[#0d0918]/95 backdrop-blur-xl border-2 border-purple-700/80 rounded-2xl p-5 shadow-[0_0_35px_rgba(168,85,247,0.4)] text-white space-y-3">
        {/* Top Close 'X' Button */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Dismiss app install prompt"
          className="absolute top-3.5 right-3.5 p-1 rounded-full bg-purple-950/80 hover:bg-purple-900 border border-purple-600/60 text-purple-300 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="flex items-start gap-3 pr-6">
          <div className="w-12 h-12 rounded-2xl bg-purple-950/90 border-2 border-purple-500/80 flex items-center justify-center text-2xl shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.5)]">
            👻
          </div>
          <div>
            <h3 className="font-gaming font-black text-sm sm:text-base text-white tracking-wider flex items-center gap-1">
              <span>INSTALL GHOST GAME ZONE</span>
            </h3>
            <p className="text-xs text-purple-200/90 font-sans mt-1 leading-snug">
              Add Ghost Game Zone to your home screen for a faster app-like experience.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-1 flex items-center gap-2">
          <button
            type="button"
            onClick={handleInstallClick}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-700 via-fuchsia-600 to-purple-800 hover:from-purple-600 hover:to-purple-700 text-white font-gaming font-black text-xs rounded-xl flex items-center justify-center gap-2 border border-purple-400/60 shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 animate-bounce" />
            <span>INSTALL APP 👻</span>
          </button>
        </div>
      </div>
    </div>
  );
}

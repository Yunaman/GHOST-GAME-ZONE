'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Gamepad2, History, BarChart3, Settings, Download, CheckCircle2 } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // Prefetch main routes on mount
  useEffect(() => {
    router.prefetch('/');
    router.prefetch('/history');
    router.prefetch('/reports');
    router.prefetch('/settings');
  }, [router]);

  // PWA beforeinstallprompt handler
  useEffect(() => {
    // Check if running in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallBanner(false);
      setDeferredPrompt(null);
      setInstallSuccess(true);
      setTimeout(() => setInstallSuccess(false), 4000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  async function handleInstallClick() {
    if (!deferredPrompt) {
      alert("To install Ghost Game Zone:\n• Android/Chrome: Tap Chrome menu (⋮) -> 'Install app' or 'Add to Home screen'\n• iPhone/Safari: Tap Share (↑) -> 'Add to Home Screen'\n• Desktop: Click the install icon in your browser address bar.");
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  }

  // Instant navigation helper
  const handleNav = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (pathname === href) return;
    router.push(href);
  };

  const navItems = [
    { href: '/', label: 'Floor', icon: Gamepad2, color: 'text-emerald-400' },
    { href: '/history', label: 'History', icon: History, color: 'text-amber-400' },
    { href: '/reports', label: 'Reports', icon: BarChart3, color: 'text-cyan-400' },
    { href: '/settings', label: 'Settings', icon: Settings, color: 'text-gray-400' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#06070a]/90 backdrop-blur-md border-b border-purple-900/40 px-3 sm:px-4 py-2.5">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
        {/* Brand */}
        <Link href="/" onClick={handleNav('/')} className="flex items-center gap-2 group shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-950/80 border border-purple-700/60 flex items-center justify-center text-purple-300 group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(168,85,247,0.25)]">
            <span className="text-lg sm:text-xl">👻</span>
          </div>
          <div>
            <h1 className="font-gaming font-black tracking-wider text-sm sm:text-base text-white leading-none flex items-center gap-1.5">
              <span>GHOST GAME ZONE</span>
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="font-handwriting text-purple-300 text-xs sm:text-sm leading-none">
                FIFA gaming center
              </span>
            </div>
          </div>
        </Link>

        {/* Right Section: PWA Install & Navigation */}
        <div className="flex items-center gap-2">
          {/* PWA Install Button */}
          {!isInstalled && (
            <button
              onClick={handleInstallClick}
              type="button"
              className="px-2.5 py-1.5 bg-purple-950/80 hover:bg-purple-900/90 text-purple-300 border border-purple-700/60 rounded-xl text-[11px] sm:text-xs font-gaming font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shrink-0"
              title="Install Ghost Game Zone App"
            >
              <Download className="w-3.5 h-3.5 text-purple-300 animate-pulse" />
              <span className="hidden md:inline">Install App</span>
            </button>
          )}

          {installSuccess && (
            <span className="text-[11px] text-emerald-400 font-gaming font-bold flex items-center gap-1 bg-emerald-950/80 px-2.5 py-1 rounded-xl border border-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Installed!
            </span>
          )}

          {/* Floor Navigation Bar */}
          <nav className="flex items-center gap-0.5 sm:gap-1 bg-[#0e121a] p-1 sm:p-1.5 rounded-xl border border-purple-900/40 font-gaming text-xs">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNav(item.href)}
                  onMouseEnter={() => router.prefetch(item.href)}
                  className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-purple-900/60 text-white font-bold border border-purple-700/60 shadow-md'
                      : 'text-zinc-400 hover:text-white hover:bg-purple-950/40'
                  }`}
                  title={item.label}
                >
                  <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}

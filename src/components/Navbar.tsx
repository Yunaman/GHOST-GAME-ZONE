'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Gamepad2, History, BarChart3, Settings, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { initSyncEngine } from '@/lib/sync/sync-engine';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  useEffect(() => {
    initSyncEngine();

    setIsOnline(navigator.onLine);

    const handleSyncStatus = (e: any) => {
      if (e.detail) {
        setIsOnline(e.detail.isOnline);
        setPendingSyncCount(e.detail.pendingCount);
      }
    };

    window.addEventListener('ghost_sync_status', handleSyncStatus);
    window.addEventListener('ghost_data_updated', () => {
      router.refresh();
    });

    return () => {
      window.removeEventListener('ghost_sync_status', handleSyncStatus);
    };
  }, [router]);

  // Prefetch routes proactively on mount
  useEffect(() => {
    router.prefetch('/');
    router.prefetch('/history');
    router.prefetch('/reports');
    router.prefetch('/settings');
  }, [router]);

  // Reset pending state on pathname change
  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const handleNavClick = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (pathname === href) return;

    setPendingHref(href);
    startTransition(() => {
      router.push(href);
    });
  };

  const navItems = [
    { href: '/', label: 'Floor', icon: Gamepad2, color: 'text-emerald-400' },
    { href: '/history', label: 'History', icon: History, color: 'text-amber-400' },
    { href: '/reports', label: 'Reports', icon: BarChart3, color: 'text-cyan-400' },
    { href: '/settings', label: 'Settings', icon: Settings, color: 'text-gray-400' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#06070a]/90 backdrop-blur-md border-b border-purple-900/40 px-3 sm:px-4 py-2.5 pointer-events-auto">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
        {/* Brand */}
        <Link
          href="/"
          onClick={handleNavClick('/')}
          className="flex items-center gap-2 group shrink-0 pointer-events-auto cursor-pointer"
        >
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

              {/* Online / Offline Sync Indicator */}
              <div className="hidden xs:flex items-center gap-1 text-[9px] font-gaming font-bold uppercase px-1.5 py-0.5 rounded border">
                {!isOnline ? (
                  <span className="text-amber-400 border-amber-800/80 bg-amber-950/60 flex items-center gap-1">
                    <WifiOff className="w-2.5 h-2.5 text-amber-400" />
                    <span>LOCAL</span>
                  </span>
                ) : pendingSyncCount > 0 ? (
                  <span className="text-purple-300 border-purple-800/80 bg-purple-950/60 flex items-center gap-1">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin text-purple-300" />
                    <span>SYNCING ({pendingSyncCount})</span>
                  </span>
                ) : (
                  <span className="text-emerald-400 border-emerald-800/80 bg-emerald-950/60 flex items-center gap-1">
                    <Wifi className="w-2.5 h-2.5 text-emerald-400" />
                    <span>SYNCED</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-2">
          <nav className="flex items-center gap-0.5 sm:gap-1 bg-[#0e121a] p-1 sm:p-1.5 rounded-xl border border-purple-900/40 font-gaming text-xs pointer-events-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const isTargeting = pendingHref === item.href && isPending;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavClick(item.href)}
                  onMouseEnter={() => router.prefetch(item.href)}
                  onTouchStart={() => router.prefetch(item.href)}
                  className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation select-none ${
                    isActive || isTargeting
                      ? 'bg-purple-900/60 text-white font-bold border border-purple-700/60 shadow-md opacity-100 scale-[1.02]'
                      : 'text-zinc-400 hover:text-white hover:bg-purple-950/40'
                  }`}
                  title={item.label}
                >
                  <Icon className={`w-3.5 h-3.5 ${item.color} ${isTargeting ? 'animate-spin' : ''}`} />
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

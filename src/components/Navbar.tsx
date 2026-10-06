import Link from 'next/link';
import { isSupabaseConfigured } from '@/lib/db/supabase';
import { Gamepad2, History, BarChart3, Settings } from 'lucide-react';

export async function Navbar() {
  return (
    <header className="sticky top-0 z-40 bg-[#06070a]/90 backdrop-blur-md border-b border-gray-800/80 px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shadow-[0_0_20px_rgba(16,185,129,0.25)]">
            <span className="text-xl">👻</span>
          </div>
          <div>
            <h1 className="font-gaming font-black tracking-wider text-base sm:text-lg text-white leading-none flex items-center gap-1.5">
              <span>GHOST GAME ZONE</span>
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-handwriting text-emerald-400 text-base leading-none">
                FIFA gaming center
              </span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-semibold ${
                  isSupabaseConfigured
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-amber-950 text-amber-400 border border-amber-800'
                }`}
              >
                {isSupabaseConfigured ? 'Supabase' : 'Local DB'}
              </span>
            </div>
          </div>
        </Link>

        {/* Floor Navigation */}
        <nav className="flex items-center gap-1 bg-[#0e121a] p-1.5 rounded-xl border border-gray-800 font-gaming text-xs">
          <Link
            href="/"
            className="px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800/80 transition-colors flex items-center gap-1.5"
            title="Gaming Floor"
          >
            <Gamepad2 className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Floor</span>
          </Link>

          <Link
            href="/history"
            className="px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800/80 transition-colors flex items-center gap-1.5"
            title="History Ledger"
          >
            <History className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">History</span>
          </Link>

          <Link
            href="/reports"
            className="px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800/80 transition-colors flex items-center gap-1.5"
            title="Owner Reports"
          >
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Reports</span>
          </Link>

          <Link
            href="/settings"
            className="px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800/80 transition-colors flex items-center gap-1.5"
            title="Settings & TV Stations"
          >
            <Settings className="w-4 h-4 text-gray-400" />
            <span className="hidden sm:inline">Settings</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

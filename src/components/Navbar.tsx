import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/db/supabase';
import { Gamepad2, History, BarChart3, Settings, ShieldAlert, LogOut } from 'lucide-react';
import { logoutAction } from '@/app/auth-actions';

export async function Navbar() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-50 bg-[#090a0f]/85 backdrop-blur-md border-b border-gray-800/80 px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-black tracking-wider text-base sm:text-lg text-white font-mono leading-none flex items-center gap-1.5">
              <span>GHOST GAME ZONE</span>
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">
                FIFA ZONE
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

        {/* User Role & Navigation */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end text-xs font-mono">
            <span className="text-gray-300 font-bold">{user.display_name}</span>
            <span className="text-[10px] text-emerald-400 font-bold uppercase">
              {user.role}
            </span>
          </div>

          <nav className="flex items-center gap-1 bg-[#121620] p-1 rounded-xl border border-gray-800">
            <Link
              href="/"
              className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800/80 transition-colors flex items-center gap-1 text-xs font-mono"
              title="Dashboard"
            >
              <Gamepad2 className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline">Floor</span>
            </Link>

            <Link
              href="/history"
              className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800/80 transition-colors flex items-center gap-1 text-xs font-mono"
              title="History"
            >
              <History className="w-4 h-4 text-amber-400" />
              <span className="hidden md:inline">History</span>
            </Link>

            <Link
              href="/reports"
              className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800/80 transition-colors flex items-center gap-1 text-xs font-mono"
              title="Reports"
            >
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <span className="hidden md:inline">Reports</span>
            </Link>

            <Link
              href="/settings"
              className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800/80 transition-colors flex items-center gap-1 text-xs font-mono"
              title="Settings"
            >
              <Settings className="w-4 h-4 text-gray-400" />
              <span className="hidden md:inline">Settings</span>
            </Link>

            {user.username !== 'staff' && (
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="p-2 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-gray-800/80 transition-colors cursor-pointer"
                  title="Switch Role / Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </form>
            )}
            {user.username === 'staff' && (
              <Link
                href="/login"
                className="p-2 rounded-lg text-gray-400 hover:text-emerald-400 hover:bg-gray-800/80 transition-colors"
                title="Manager / Owner Login"
              >
                <ShieldAlert className="w-4 h-4" />
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginAction } from '@/app/auth-actions';
import { Lock, User, ShieldCheck, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('manager');
  const [pin, setPin] = useState('1234');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await loginAction(username, pin);
      if (res.success) {
        router.push('/');
        router.refresh();
      } else {
        setError(res.error || 'Login failed');
      }
    } catch (err: any) {
      setError(err?.message || 'Error occurred during login');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-md mx-auto my-8">
      <div className="ghost-glass-card p-6 space-y-5">
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-mono font-bold flex items-center justify-center mx-auto text-xl shadow-lg">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-mono font-bold text-white mt-2">
            STAFF / MANAGER ACCESS
          </h1>
          <p className="text-xs font-mono text-gray-400">
            Sign in to switch role or access management reports
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 font-mono text-xs">
          <div>
            <label className="block text-gray-300 font-bold uppercase mb-1">
              User Account
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
              <select
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-white font-bold text-sm outline-none focus:border-emerald-500"
              >
                <option value="owner">Owner (Full Permissions)</option>
                <option value="manager">Manager (Reports & Settings)</option>
                <option value="staff">Staff (Floor Operations)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-gray-300 font-bold uppercase mb-1">
              PIN Code
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="e.g. 1234"
              className="w-full px-3 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-white font-bold text-sm outline-none focus:border-emerald-500"
            />
            <span className="text-[10px] text-gray-500 mt-1 block">Default seed PIN is 1234</span>
          </div>

          {error && (
            <div className="p-2.5 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 ghost-btn-primary font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                <span>SIGN IN & CONTINUE</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

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
      <div className="paper-card p-6 space-y-5">
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white font-mono font-bold flex items-center justify-center mx-auto text-xl shadow-md">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-mono font-bold text-gray-900 mt-2">
            STAFF / MANAGER ACCESS
          </h1>
          <p className="text-xs font-mono text-gray-500">
            Sign in to switch role or access management reports
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 font-mono text-xs">
          <div>
            <label className="block text-gray-700 font-bold uppercase mb-1">
              User Account
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <select
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="owner">Owner (Full Permissions)</option>
                <option value="manager">Manager (Reports & Settings)</option>
                <option value="staff">Staff (Floor Operations)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-bold uppercase mb-1">
              PIN Code
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="e.g. 1234"
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <span className="text-[10px] text-gray-500 mt-1 block">Default seed PIN is 1234</span>
          </div>

          {error && (
            <div className="p-2.5 bg-rose-100 border border-rose-300 text-rose-800 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 tactile-button transition-all disabled:opacity-50 text-sm"
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

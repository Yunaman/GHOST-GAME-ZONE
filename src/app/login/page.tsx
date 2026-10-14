'use client';

import { useState } from 'react';
import { loginAction } from '@/app/auth-actions';
import { useRouter } from 'next/navigation';
import { Lock, User, Eye, EyeOff, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (isLoading) return;

    if (!username.trim() || !password) {
      setErrorMsg('Please enter both username and password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await loginAction(username, password);
      if (res.success) {
        router.push('/');
        router.refresh();
      } else {
        setErrorMsg(res.error || 'Invalid credentials');
        setIsLoading(false);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Login failed. Please try again.');
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0c0e14] border border-purple-900/60 rounded-2xl shadow-[0_0_30px_rgba(168,85,247,0.2)] overflow-hidden backdrop-blur-md">
        {/* Header */}
        <div className="bg-[#121622] p-6 text-center border-b border-purple-900/40 relative">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-950/90 border border-purple-600/80 flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(168,85,247,0.3)] mb-3">
            👻
          </div>
          <h1 className="font-gaming font-black text-2xl text-white tracking-wider flex items-center justify-center gap-2">
            <span>GHOST GAME CENTER</span>
          </h1>
          <p className="font-handwriting text-purple-300 text-lg mt-1">
            FIFA gaming center management system
          </p>

          <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-gaming font-bold text-amber-300 bg-amber-950/60 px-3 py-1 rounded-full border border-amber-800/60">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>AUTHORIZATION REQUIRED</span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleLogin} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 bg-rose-950/90 border border-rose-800 text-rose-200 text-xs font-sans rounded-xl flex items-center gap-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Username Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-gaming font-bold text-purple-200 uppercase tracking-wider">
              USERNAME
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-purple-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter registered username"
                required
                className="w-full pl-10 pr-4 py-3 bg-black/80 border border-purple-900/60 rounded-xl text-white font-gaming text-sm outline-none focus:border-purple-400 transition-colors"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-gaming font-bold text-purple-200 uppercase tracking-wider">
              PASSWORD
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-purple-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                className="w-full pl-10 pr-11 py-3 bg-black/80 border border-purple-900/60 rounded-xl text-white font-mono text-sm outline-none focus:border-purple-400 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-white cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 ghost-btn-primary font-gaming font-black text-base rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50 mt-2"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-black" />
            ) : (
              <span className="text-black tracking-wide font-black">LOGIN TO GAMING FLOOR 👻</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 text-purple-300">
      <div className="p-4 bg-purple-950/60 border border-purple-800/80 rounded-2xl shadow-[0_0_20px_rgba(168,85,247,0.3)] animate-pulse">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
      <p className="font-gaming font-bold text-xs sm:text-sm tracking-wider text-purple-200">
        LOADING GHOST GAME ZONE... 👻
      </p>
    </div>
  );
}

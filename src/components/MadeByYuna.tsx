import React from 'react';

interface MadeByYunaProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const MadeByYuna: React.FC<MadeByYunaProps> = ({
  className = '',
  size = 'md',
}) => {
  const sizeStyles = {
    sm: 'text-xs tracking-wider gap-1.5',
    md: 'text-sm tracking-widest gap-2',
    lg: 'text-base tracking-widest gap-2.5',
  };

  return (
    <div
      className={`inline-flex items-center justify-center font-bold animate-ghost-float select-none ${sizeStyles[size]} ${className}`}
    >
      <span className="text-zinc-400 font-mono uppercase text-[10px] sm:text-xs">
        MADE BY
      </span>
      <span className="bg-gradient-to-r from-purple-400 via-fuchsia-300 to-amber-300 bg-clip-text text-transparent font-serif italic drop-shadow-[0_2px_8px_rgba(168,85,247,0.5)]">
        YUNA
      </span>
      <span className="inline-block transform hover:rotate-12 transition-transform duration-200">
        👻
      </span>
    </div>
  );
};

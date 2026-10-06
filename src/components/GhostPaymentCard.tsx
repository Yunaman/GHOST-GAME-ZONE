import React from 'react';
import Image from 'next/image';

interface GhostPaymentCardProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const GhostPaymentCard: React.FC<GhostPaymentCardProps> = ({
  className = '',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'max-w-[280px] sm:max-w-[320px]',
    md: 'max-w-[400px] sm:max-w-[480px]',
    lg: 'max-w-[580px] sm:max-w-[680px]',
  };

  return (
    <div
      className={`relative group mx-auto w-full transition-transform duration-300 hover:scale-[1.02] ${sizeClasses[size]} ${className}`}
    >
      {/* Subtle glowing purple aura backdrop */}
      <div className="absolute -inset-1.5 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 rounded-3xl blur-md opacity-40 group-hover:opacity-75 transition duration-500 pointer-events-none" />

      {/* Main Responsive Payment Card Image Frame */}
      <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-purple-500/30 bg-black/80 backdrop-blur-md">
        <Image
          src="/ghost-payment-card.png"
          alt="Ghost Game Zone Official Payment Card"
          width={800}
          height={480}
          className="w-full h-auto object-contain block"
          priority
        />
      </div>
    </div>
  );
};

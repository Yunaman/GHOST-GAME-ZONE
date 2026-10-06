import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { GhostCanvas } from '@/components/GhostCanvas';

export const metadata: Metadata = {
  title: 'Ghost Game Zone | FIFA Gaming Center',
  description: 'Production-ready mobile-first FIFA gaming center management system for Ethiopia',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#090a0f] text-gray-100 antialiased selection:bg-emerald-500 selection:text-black relative">
        {/* 3D Atmospheric Ghost Background */}
        <GhostCanvas />

        {/* Foreground Content */}
        <div className="relative z-10 flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-24">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

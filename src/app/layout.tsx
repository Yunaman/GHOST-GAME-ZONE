import type { Metadata } from 'next';
import { Orbitron, Caveat, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { GhostCanvas } from '@/components/GhostCanvas';
import { IntroSplash } from '@/components/IntroSplash';

const gamingFont = Orbitron({
  subsets: ['latin'],
  variable: '--font-gaming',
  weight: ['400', '600', '700', '800', '900'],
  display: 'swap',
});

const handwritingFont = Caveat({
  subsets: ['latin'],
  variable: '--font-handwriting',
  weight: ['400', '600', '700'],
  display: 'swap',
});

const sansFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Ghost Game Zone 👻 | FIFA Gaming Center',
  description: 'Production gaming center management system for Ghost Game Zone in Ethiopia',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${gamingFont.variable} ${handwritingFont.variable} ${sansFont.variable}`}>
      <body className="min-h-screen bg-[#06070a] text-gray-100 font-sans antialiased selection:bg-emerald-500 selection:text-black relative overflow-x-hidden">
        {/* Intro Splash Experience */}
        <IntroSplash />

        {/* 3D Atmospheric Background Ghost */}
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

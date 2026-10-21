import type { Metadata, Viewport } from 'next';
import { Orbitron, Caveat, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { GhostCanvas } from '@/components/GhostCanvas';
import { IntroSplash } from '@/components/IntroSplash';
import { ThemeProvider } from '@/components/ThemeProvider';
import { MadeByYuna } from '@/components/MadeByYuna';
import { InstallAppCard } from '@/components/InstallAppCard';
import { getAuthUser } from '@/lib/auth';

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
  title: 'GHOST GAME CENTER 👻 | FIFA Gaming Center',
  description: 'Production multi-customer gaming center management system',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'GHOST GAME CENTER',
  },
};

export const viewport: Viewport = {
  themeColor: '#120d21',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();
  const displayName = user?.display_name || 'Game Zone';
  const isOwner = user?.role === 'OWNER';

  return (
    <html lang="en" className={`dark ${gamingFont.variable} ${handwritingFont.variable} ${sansFont.variable}`} data-theme="theme-purple">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans antialiased selection:bg-purple-600 selection:text-white relative overflow-x-hidden">
        <ThemeProvider>
          {/* Intro Splash Experience */}
          <IntroSplash />

          {/* 3D Atmospheric Background Ghost (pointer-events: none) */}
          <GhostCanvas />

          {/* Foreground Content */}
          <div className="relative z-10 flex flex-col min-h-screen">
            <Navbar displayName={displayName} isOwner={isOwner} />
            <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-12">
              {children}
            </main>

            {/* Install PWA Prompt Card */}
            <InstallAppCard />

            {/* Consistent Compact Footer */}
            <footer className="w-full border-t border-purple-900/30 bg-black/60 backdrop-blur-md py-6 px-4 text-center">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-xs text-zinc-400">
                <span className="font-gaming font-bold tracking-widest text-purple-300">
                  👻 GHOST GAME CENTER
                </span>
                <span className="hidden sm:inline text-zinc-600">•</span>
                <MadeByYuna size="sm" />
              </div>
            </footer>
          </div>
        </ThemeProvider>

        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(reg) {
                    console.log('GHOST GAME CENTER SW registered:', reg.scope);
                  }).catch(function(err) {
                    console.log('SW registration failed:', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}

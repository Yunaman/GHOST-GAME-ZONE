import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Ghost Game Zone | FIFA Floor Management',
  description: 'Production-ready mobile-first FIFA gaming center management system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0e1015] text-gray-200 antialiased selection:bg-emerald-500 selection:text-black">
        <Navbar />
        <main className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-20">
          {children}
        </main>
      </body>
    </html>
  );
}

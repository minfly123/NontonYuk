'use client';

import './globals.css';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Clapperboard, Calendar } from 'lucide-react';

export default function RootLayout({ children }) {
  const pathname = usePathname();

  const navItems = [
    { name: 'Beranda', href: '/', icon: Home },
    { name: 'Anime', href: '/jadwal', icon: Calendar },
    { name: 'Dracin', href: '/dracin', icon: Clapperboard },
  ];

  return (
    <html lang="id">
      <body className="antialiased pb-28">
        {/* Top Header */}
        <header className="sticky top-0 z-40 px-4 pt-3 pb-2">
          <div className="max-w-5xl mx-auto glass-card rounded-2xl px-4 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl glow-badge flex items-center justify-center text-white font-extrabold text-lg">
                N
              </div>
              <div>
                <h1 className="font-extrabold text-lg tracking-tight text-slate-800 leading-none">
                  Nonton<span className="text-purple-600">Yuk</span>
                </h1>
                <span className="text-[11px] font-medium text-slate-500">
                  Anime & Melolo Stream
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold text-white glow-badge">
                VIP FREE
              </span>
            </div>
          </div>
        </header>

        {/* Konten Utama */}
        <main className="max-w-5xl mx-auto px-4 pt-2">
          {children}
        </main>

        {/* Floating Bottom Navigation */}
        <nav className="fixed bottom-4 left-0 right-0 z-50 px-4">
          <div className="max-w-md mx-auto glass-nav rounded-3xl px-3 py-2 flex items-center justify-around">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex flex-col items-center justify-center px-4 py-1.5 rounded-2xl transition-all duration-200 ${
                    isActive
                      ? 'bg-pink-100/90 text-pink-600 font-bold scale-105'
                      : 'text-slate-500 hover:text-slate-800 font-medium'
                  }`}
                >
                  <Icon className="w-5 h-5 mb-0.5" strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-[11px]">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </body>
    </html>
  );
                  }
                          

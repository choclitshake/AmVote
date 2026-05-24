import { useState, useEffect } from 'react';
import { WalletConnect } from './WalletConnect';
import { Navigation } from './Navigation';

export function Header() {
  const [isDark, setIsDark] = useState(true);

  // Initialize from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('amvote-theme');
    if (stored === 'light') {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    } else {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('amvote-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('amvote-theme', 'light');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-bg-surface/80 backdrop-blur-md border-b border-bg-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Top row: Logo + Wallet */}
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <a href="/" className="flex items-center gap-3 no-underline">
              <img src="/logo.png" alt="AmVote logo" className="w-11 h-11 rounded-full ring-1 ring-violet-500/40 shadow-violet-glow" />
              <div>
                <h1 className="text-xl sm:text-2xl font-heading font-bold bg-gradient-to-r from-violet-400 to-violet-300 bg-clip-text text-transparent leading-tight m-0">
                  AmVote
                </h1>
                <p className="font-body text-text-muted text-xs hidden sm:block leading-tight m-0">
                  Transparent Voting on Cardano
                </p>
              </div>
            </a>
          </div>

          <div className="flex items-center gap-3">
            {/* Dark mode toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-bg-elevated border border-bg-border hover:border-violet-500/50 text-text-secondary hover:text-text-primary transition-all duration-200"
              aria-label="Toggle theme"
            >
              {isDark ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            <WalletConnect />
          </div>
        </div>

        {/* Navigation row */}
        <Navigation />
      </div>
    </header>
  );
}
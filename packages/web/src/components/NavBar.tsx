import { useState, useEffect } from 'react';
import VigilLogo from './VigilLogo';
import posthog from 'posthog-js';

export default function NavBar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored) return stored === 'dark';
      // Default to white mode (light)
      return false;
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
      document.cookie = 'theme=dark; path=/; max-age=31536000; SameSite=Lax';
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
      document.cookie = 'theme=light; path=/; max-age=31536000; SameSite=Lax';
    }
  }, [isDark]);

  const toggleTheme = () => {
    const next = !isDark;
    posthog.capture('theme_toggled', { theme: next ? 'dark' : 'light' });
    setIsDark(next);
  };

  const getAppUrl = () => {
    const currentTheme = isDark ? 'dark' : 'light';
    if (typeof window === 'undefined') return `/app/login?theme=${currentTheme}`;
    if (window.location.port === '3002') return `http://localhost:3000/login?theme=${currentTheme}`;
    if (window.location.port === '5174') return `http://localhost:5173/login?theme=${currentTheme}`;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return `http://localhost:3000/login?theme=${currentTheme}`;
    }
    return `/app/login?theme=${currentTheme}`;
  };

  const handleLaunchConsole = () => {
    posthog.capture('launch_console_clicked', { location: 'navbar' });
    setMobileOpen(false);
    window.location.href = getAppUrl();
  };

  return (
    <header className="w-full sticky top-0 z-50 bg-background/70 backdrop-blur-xl border-b border-outline-variant transition-colors duration-300">
      <div className="flex justify-between items-center h-16 px-4 sm:px-6 max-w-max-width mx-auto">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <VigilLogo height={20} />
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-surface-container-high text-on-surface-variant border border-outline-variant">
            SRE Copilot
          </span>
        </a>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8">
          <a
            href="#architecture"
            className="text-xs font-medium text-on-surface-variant hover:text-on-surface transition-colors duration-150"
          >
            Architecture
          </a>
          <a
            href="#pipeline"
            className="text-xs font-medium text-on-surface-variant hover:text-on-surface transition-colors duration-150"
          >
            Agent Pipeline
          </a>
          <a
            href="#install"
            className="text-xs font-medium text-on-surface-variant hover:text-on-surface transition-colors duration-150"
          >
            Deployment
          </a>
          <a
            href="https://github.com/rajpreet-s/vigil"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-on-surface-variant hover:text-on-surface flex items-center gap-1 transition-colors duration-150"
          >
            <span>GitHub</span>
            <span className="material-symbols-outlined text-[13px]">arrow_outward</span>
          </a>
        </nav>

        {/* Theme Toggle + Launch Console + Mobile Hamburger */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all flex items-center justify-center border border-outline-variant/60"
            aria-label="Toggle theme"
            title={isDark ? "Switch to Dawn light mode" : "Switch to Vigil dark mode"}
          >
            <span className="material-symbols-outlined text-[18px]">
              {isDark ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          {/* Launch Console CTA */}
          <button
            onClick={handleLaunchConsole}
            className="bg-gradient-to-b from-[#F97316] to-[#D97706] text-white font-semibold text-xs px-4 py-2 rounded-lg hover:brightness-105 active:scale-[0.98] transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_4px_12px_rgba(234,88,12,0.25)] border border-[#C2410C]/80 flex items-center gap-1.5"
          >
            <span>Launch Console</span>
            <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
          </button>
          
          {/* Mobile hamburger */}
          <button
            className="md:hidden w-9 h-9 rounded-lg text-on-surface-variant hover:bg-surface-container flex items-center justify-center border border-outline-variant/60 transition-colors"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle mobile menu"
          >
            <span className="material-symbols-outlined text-[20px]">
              {mobileOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Nav Dropdown */}
      {mobileOpen && (
        <div className="md:hidden bg-surface-container/95 backdrop-blur-2xl border-b border-outline-variant px-6 py-4 flex flex-col gap-3 animate-fadeIn">
          <a
            href="#architecture"
            onClick={() => setMobileOpen(false)}
            className="text-sm font-medium text-on-surface-variant hover:text-on-surface py-2 border-b border-outline-variant/40"
          >
            Architecture
          </a>
          <a
            href="#pipeline"
            onClick={() => setMobileOpen(false)}
            className="text-sm font-medium text-on-surface-variant hover:text-on-surface py-2 border-b border-outline-variant/40"
          >
            Agent Pipeline
          </a>
          <a
            href="#install"
            onClick={() => setMobileOpen(false)}
            className="text-sm font-medium text-on-surface-variant hover:text-on-surface py-2 border-b border-outline-variant/40"
          >
            Deployment
          </a>
          <a
            href="https://github.com/rajpreet-s/vigil"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMobileOpen(false)}
            className="text-sm font-medium text-on-surface-variant hover:text-on-surface py-2 flex items-center justify-between"
          >
            <span>GitHub</span>
            <span className="material-symbols-outlined text-sm">arrow_outward</span>
          </a>
        </div>
      )}
    </header>
  );
}

import { useState, useEffect } from 'react';
import VigilLogo from './VigilLogo';

export default function NavBar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored) return stored === 'dark';
      return document.documentElement.classList.contains('dark') ||
             window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  const handleScrollToInstall = () => {
    setMobileOpen(false);
    const el = document.getElementById('install');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="w-full sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant transition-colors duration-300">
      <div className="flex justify-between items-center h-16 px-md max-w-max-width mx-auto">
        {/* Logo */}
        <a href="/" className="flex items-center gap-sm hover:opacity-90 transition-opacity">
          <VigilLogo height={20} />
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-xl">
          <a
            href="#how-it-works"
            className="font-body-md text-sm font-medium text-on-surface-variant hover:text-primary transition-colors duration-200"
          >
            How it works
          </a>
          <a
            href="https://github.com/rajpreet-s/vigil"
            target="_blank"
            rel="noopener noreferrer"
            className="font-body-md text-sm font-medium text-on-surface-variant hover:text-primary flex items-center gap-xs transition-colors duration-200"
          >
            GitHub
            <span className="material-symbols-outlined text-xs">open_in_new</span>
          </a>
        </nav>

        {/* Theme Toggle + CTA + mobile hamburger */}
        <div className="flex items-center gap-md">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-sm rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-all duration-200 flex items-center justify-center"
            aria-label="Toggle visual theme"
            title={isDark ? "Switch to Dawn light mode" : "Switch to Vigil dark mode"}
          >
            <span className="material-symbols-outlined text-[20px] transition-transform duration-300 hover:rotate-45">
              {isDark ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          <button
            onClick={handleScrollToInstall}
            className="bg-on-surface text-background px-lg py-sm rounded-lg font-bold hover:opacity-90 transition-all text-sm shadow-sm"
          >
            Get Started
          </button>
          
          <button
            className="md:hidden p-sm rounded text-on-surface-variant hover:bg-surface-container-high transition-colors"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            <span className="material-symbols-outlined text-xl">
              {mobileOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile nav dropdown */}
      {mobileOpen && (
        <nav className="md:hidden bg-surface-container border-t border-outline-variant px-md py-sm flex flex-col gap-sm animate-fadeIn">
          <a
            href="#how-it-works"
            onClick={() => setMobileOpen(false)}
            className="font-body-md text-body-md text-on-surface-variant hover:text-primary py-sm transition-colors duration-200 border-b border-outline-variant/30"
          >
            How it works
          </a>
          <a
            href="https://github.com/rajpreet-s/vigil"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMobileOpen(false)}
            className="font-body-md text-body-md text-on-surface-variant hover:text-primary py-sm flex items-center gap-xs transition-colors duration-200 border-b border-outline-variant/30"
          >
            GitHub
            <span className="material-symbols-outlined text-xs">open_in_new</span>
          </a>
        </nav>
      )}
    </header>
  );
}

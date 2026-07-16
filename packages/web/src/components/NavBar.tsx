import { useState } from 'react';
import VigilLogo from './VigilLogo';



const navLinks = [
  { href: '#platform', label: 'Platform' },
  { href: '#integrations', label: 'Integrations' },
  { href: '#changelog', label: 'Changelog' },
];

export default function NavBar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="w-full sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant">
      <div className="flex justify-between items-center h-16 px-md max-w-max-width mx-auto">
        {/* Logo */}
        <div className="flex items-center gap-sm">
          <VigilLogo height={20} />
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-xl">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors duration-200"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* CTA + mobile hamburger */}
        <div className="flex items-center gap-sm">
          <button className="bg-on-surface text-background px-lg py-sm rounded font-bold hover:opacity-90 transition-opacity text-sm">
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
        <nav className="md:hidden bg-surface-container border-t border-outline-variant px-md py-sm flex flex-col gap-sm">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="font-body-md text-body-md text-on-surface-variant hover:text-primary py-sm transition-colors duration-200"
            >
              {link.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}

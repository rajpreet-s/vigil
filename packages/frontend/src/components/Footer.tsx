import React from 'react';
import VigilLogo from './VigilLogo';



const links = [
  { label: 'Documentation', href: '#' },
  { label: 'GitHub', href: 'https://github.com/rajpreet-s/vigil' },
  { label: 'Privacy Policy', href: '#' },
  { label: 'Terms of Service', href: '#' },
];

export default function Footer() {
  return (
    <footer className="w-full py-xl bg-surface-container-lowest border-t border-outline-variant">
      <div className="flex flex-col md:flex-row justify-between items-center px-md max-w-max-width mx-auto gap-md">
        {/* Brand */}
        <div className="flex flex-col gap-xs items-center md:items-start">
          <div className="flex items-center gap-sm">
            <VigilLogo height={18} color="#9e8e7c" />
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">
            © {new Date().getFullYear()} Vigil. Open-source under MIT.
          </p>
        </div>

        {/* Links */}
        <div className="flex flex-wrap justify-center md:justify-end items-center gap-xl">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target={link.href.startsWith('http') ? '_blank' : undefined}
              rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="font-body-md text-body-md text-on-surface-variant hover:text-on-surface underline underline-offset-2 transition-all"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

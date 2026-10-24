import VigilLogo from './VigilLogo';
import { ArrowUpRight } from 'lucide-react';

export default function Footer() {
  const getAppUrl = () => {
    if (typeof window === 'undefined') return '/app/login';
    if (window.location.port === '3002') return 'http://localhost:3000/login';
    if (window.location.port === '5174') return 'http://localhost:5173/login';
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3000/login';
    }
    return '/app/login';
  };

  return (
    <footer className="w-full py-12 bg-surface-container-lowest border-t border-outline-variant transition-colors duration-300">
      <div className="max-w-max-width mx-auto px-4 sm:px-6 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          {/* Brand & Mission */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <VigilLogo height={22} />
            </div>
            <p className="text-xs text-on-surface-variant max-w-sm leading-relaxed">
              Agentic incident investigation and alert collapse for modern SRE teams. 
              Open-source under MIT.
            </p>
          </div>
        </div>

        {/* Navigation & Resource Links */}
        <div className="pt-6 border-t border-outline-variant/60 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-on-surface-variant">
          <div className="flex flex-wrap items-center gap-6">
            <a href="#architecture" className="hover:text-on-surface transition-colors">
              Architecture
            </a>
            <a href="#pipeline" className="hover:text-on-surface transition-colors">
              Agent Pipeline
            </a>
            <a href="#install" className="hover:text-on-surface transition-colors">
              Deployment
            </a>
            <a href="#principles" className="hover:text-on-surface transition-colors">
              Principles
            </a>
            <a
              href="https://github.com/rajpreet-s/vigil"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-on-surface transition-colors flex items-center gap-1"
            >
              <span>GitHub</span>
              <ArrowUpRight className="w-3 h-3" />
            </a>
            <a
              href={getAppUrl()}
              className="text-primary-container font-semibold hover:underline"
            >
              Launch Console
            </a>
          </div>

          <div>
            © {new Date().getFullYear()} Vigil SRE. MIT Licensed.
          </div>
        </div>
      </div>
    </footer>
  );
}

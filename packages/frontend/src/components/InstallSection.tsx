import React, { useState } from 'react';

const COMMAND = 'docker-compose up -d';

export default function InstallSection() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(COMMAND);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = COMMAND;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section id="install" className="bg-surface-container-lowest py-section-desktop px-md">
      <div className="max-w-max-width mx-auto text-center section-reveal">
        <div className="max-w-2xl mx-auto mb-xl">
          <span className="font-label-mono text-xs text-primary-container uppercase tracking-widest block mb-sm">
            Developers
          </span>
          <h2 className="font-headline-lg text-headline-lg mb-md">Up in seconds.</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Install simplicity is a first-class principle. Point it at your Alertmanager webhook
            and Slack app token.
          </p>
        </div>

        <div className="max-w-xl mx-auto bg-surface-container border border-outline-variant rounded-xl overflow-hidden shadow-2xl text-left">
          {/* Window chrome */}
          <div className="bg-surface-container-high px-md py-sm flex items-center gap-xs border-b border-outline-variant">
            <div className="w-3 h-3 rounded-full bg-error/40" />
            <div className="w-3 h-3 rounded-full bg-primary-container/40" />
            <div className="w-3 h-3 rounded-full bg-secondary/40" />
            <span className="ml-2 font-label-mono text-[10px] text-on-surface-variant/60 uppercase">
              Terminal
            </span>
          </div>

          {/* Command */}
          <div className="p-lg font-label-mono text-md">
            <div className="flex items-center gap-sm group">
              <span className="text-primary-container select-none">$</span>
              <span className="text-on-surface">{COMMAND}</span>
              <button
                onClick={handleCopy}
                className="ml-auto p-xs hover:bg-surface-container-highest rounded text-on-surface-variant transition-colors relative"
                title="Copy to clipboard"
              >
                <span className="material-symbols-outlined text-sm">
                  {copied ? 'check' : 'content_copy'}
                </span>
                {copied && (
                  <span className="absolute -top-7 right-0 text-[10px] bg-surface-container-high border border-outline-variant rounded px-sm py-[2px] text-primary-container whitespace-nowrap">
                    Copied!
                  </span>
                )}
              </button>
            </div>

            <div className="text-on-surface-variant/40 mt-sm text-sm leading-relaxed">
              # Checking dependencies...
              <br />
              # Starting Vigil Engine v2.4.1...
              <br />
              # Listening on port 8080...
            </div>
          </div>
        </div>

        {/* Extra links */}
        <div className="mt-xl flex flex-col sm:flex-row gap-md justify-center items-center">
          <a
            href="https://github.com/rajpreet-s/vigil"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-sm font-body-md text-sm text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-base">open_in_new</span>
            Read the docs on GitHub
          </a>
          <span className="hidden sm:block text-outline-variant">·</span>
          <a
            href="https://github.com/rajpreet-s/vigil/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-sm font-body-md text-sm text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-base">bug_report</span>
            File an issue
          </a>
        </div>
      </div>
    </section>
  );
}

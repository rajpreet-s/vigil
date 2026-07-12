import React from 'react';

const limitations = [
  {
    title: 'Not a replacement',
    body: 'No on-call scheduling, no paging escalation, no dashboards. Use PagerDuty or Opsgenie for that. Vigil sits in front.',
  },
  {
    title: 'No LLM Reasoning',
    body: 'Correlation is deterministic TypeScript. The LLM handles message styling, not incident decision-making.',
  },
  {
    title: 'No Built-in Scraper',
    body: "Vigil reads from Alertmanager and your topology config. It doesn't collect telemetry or logs for you.",
  },
];

export default function ScopeSection() {
  return (
    <section
      id="scope"
      className="py-section-desktop px-md border-t border-outline-variant"
    >
      <div className="max-w-max-width mx-auto section-reveal">
        <div className="text-center mb-xl">
          <span className="font-label-mono text-xs text-primary-container uppercase tracking-widest block mb-sm">
            Philosophy
          </span>
          <h2 className="font-headline-lg text-headline-lg mb-md">What Vigil isn't</h2>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mx-auto">
            This solves one problem well. It's not trying to be everything an incident platform
            could be.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
          {limitations.map((item) => (
            <div
              key={item.title}
              className="bg-surface border border-outline-variant p-md rounded-xl hover:bg-surface-container-low transition-colors group"
            >
              <div className="flex items-center gap-sm mb-sm">
                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-error transition-colors">
                  cancel
                </span>
                <h4 className="font-label-mono text-sm font-bold">{item.title}</h4>
              </div>
              <p className="font-body-md text-sm text-on-surface-variant">{item.body}</p>
            </div>
          ))}
        </div>

        {/* Honest status callout */}
        <div className="mt-xl border border-outline-variant/60 rounded-xl p-lg bg-surface-container-low flex flex-col sm:flex-row gap-md items-start sm:items-center">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-container/10 flex items-center justify-center">
            <span
              className="material-symbols-outlined text-primary-container"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              info
            </span>
          </div>
          <div>
            <p className="font-label-mono text-sm text-on-surface font-bold mb-xs">
              Current status: Proof of concept
            </p>
            <p className="font-body-md text-sm text-on-surface-variant">
              Vigil is a working pipeline, not a production-hardened system. The core correlation
              engine functions end-to-end; hardening, observability, and edge-case handling are
              ongoing.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

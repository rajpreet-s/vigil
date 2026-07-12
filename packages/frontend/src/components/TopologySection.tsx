import React from 'react';

const cards = [
  {
    icon: 'account_tree',
    title: 'Topology-aware grouping',
    body: 'Alerts are only grouped if they sit on a connected path in your service graph. Unrelated alerts get filtered out instead of merged in.',
  },
  {
    icon: 'reorder',
    title: 'Causal timelines',
    body: 'Root cause first, downstream effects after. Confidence tiers handle scrape jitter when raw ordering is unreliable.',
  },
  {
    icon: 'chat_bubble_outline',
    title: 'Slack threading',
    body: 'A settle timer groups new related alerts into a single Slack thread instead of paging you repeatedly for the same outage.',
  },
];

export default function TopologySection() {
  return (
    <section
      id="platform"
      className="bg-surface py-section-desktop px-md border-y border-outline-variant relative overflow-hidden"
    >
      <div className="max-w-max-width mx-auto relative z-10 section-reveal">
        <div className="max-w-2xl mb-xl">
          <span className="font-label-mono text-xs text-primary-container uppercase tracking-widest block mb-sm">
            Infrastructure-First
          </span>
          <h2 className="font-headline-lg text-headline-lg mb-md">
            Timestamps lie. Topology doesn't.
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Grouping alerts by "fired around the same time" catches coincidences along with real
            incidents. Vigil uses your service dependency graph to tell the difference.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
          {cards.map((card) => (
            <div
              key={card.title}
              className="feature-card bg-surface-container-low border border-outline-variant p-lg rounded-xl hover:bg-surface-container group cursor-default"
            >
              <div className="w-12 h-12 bg-primary-container/10 rounded-lg flex items-center justify-center mb-md group-hover:scale-110 transition-transform">
                <span
                  className="material-symbols-outlined text-primary-container"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {card.icon}
                </span>
              </div>
              <h3 className="font-headline-md text-lg mb-sm">{card.title}</h3>
              <p className="font-body-md text-on-surface-variant text-sm leading-relaxed">
                {card.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

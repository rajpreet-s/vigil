import React from 'react';

const steps = [
  {
    number: '1',
    title: 'IncidentCoordinator',
    body: 'Alerts land, a 60-second settle timer starts, resetting only when a new unique service joins the storm — capped at 5 minutes.',
  },
  {
    number: '2',
    title: 'correlate_node',
    body: "The topology graph filters signal from coincidence and builds the causal timeline from what's actually connected.",
  },
  {
    number: '3',
    title: 'Delivery',
    body: 'One Slack message, root cause first. Anything topology-connected that fires later becomes a thread reply, not a new page.',
  },
];

const codeLines: { type: 'keyword' | 'primary' | 'string' | 'comment' | 'normal'; text: string }[][] = [
  [
    { type: 'keyword', text: 'const' },
    { type: 'normal', text: ' coordinator = ' },
    { type: 'primary', text: 'new' },
    { type: 'normal', text: ' IncidentCoordinator({' },
  ],
  [{ type: 'normal', text: '    settleTime: ' }, { type: 'keyword', text: '60s' }, { type: 'normal', text: ',' }],
  [{ type: 'normal', text: '    maxWait: ' }, { type: 'keyword', text: '5m' }],
  [{ type: 'normal', text: '});' }],
  [{ type: 'normal', text: '' }],
  [{ type: 'comment', text: '// Logic executed on every alert ingestion' }],
  [
    { type: 'normal', text: 'coordinator.' },
    { type: 'primary', text: 'on' },
    { type: 'string', text: "('alert'" },
    { type: 'normal', text: ', (alert) => {' },
  ],
  [
    { type: 'keyword', text: '    const' },
    { type: 'normal', text: ' nodes = graph.' },
    { type: 'primary', text: 'correlate_node' },
    { type: 'normal', text: '(alert.service_id);' },
  ],
  [
    { type: 'primary', text: '    if' },
    { type: 'normal', text: ' (nodes.length > ' },
    { type: 'keyword', text: '0' },
    { type: 'normal', text: ') {' },
  ],
  [{ type: 'comment', text: '        // Group under existing incident' }],
  [{ type: 'normal', text: '        incidentStore.append(nodes[0].incident_id, alert);' }],
  [{ type: 'primary', text: '    } else' }, { type: 'normal', text: ' {' }],
  [{ type: 'comment', text: '        // Create new root incident' }],
  [{ type: 'normal', text: '        incidentStore.create(alert);' }],
  [{ type: 'normal', text: '    }' }],
  [{ type: 'normal', text: '});' }],
];

const colorMap = {
  keyword: 'text-primary-container',
  primary: 'text-primary',
  string: 'text-secondary',
  comment: 'text-outline',
  normal: 'text-on-surface-variant',
};

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-section-desktop px-md">
      <div className="max-w-max-width mx-auto section-reveal">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl items-center">
          {/* Steps */}
          <div className="lg:col-span-5">
            <span className="font-label-mono text-xs text-primary-container uppercase tracking-widest block mb-sm">
              The Process
            </span>
            <h2 className="font-headline-lg text-headline-lg mb-md">
              Three steps, deterministic
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant mb-xl">
              The reasoning lives in plain TypeScript, not an LLM call. The LLM's only job — if
              it's used at all — is formatting the final message for humans.
            </p>

            <div className="space-y-lg">
              {steps.map((step) => (
                <div key={step.number} className="flex gap-md">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full border border-primary-container text-primary-container flex items-center justify-center font-label-mono text-xs">
                    {step.number}
                  </div>
                  <div>
                    <h4 className="font-label-mono text-sm text-on-surface font-bold mb-xs">
                      {step.title}
                    </h4>
                    <p className="font-body-md text-sm text-on-surface-variant">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Code terminal */}
          <div className="lg:col-span-7">
            <div className="bg-surface-container-low border border-outline-variant p-md rounded-xl shadow-xl">
              <div className="bg-surface-container-highest/30 p-lg rounded-lg font-label-mono text-sm terminal-scroll overflow-x-auto border border-outline-variant/30">
                <pre className="leading-relaxed">
                  {codeLines.map((line, i) => (
                    <div key={i}>
                      {line.length === 0 || (line.length === 1 && line[0].text === '') ? (
                        <br />
                      ) : (
                        line.map((token, j) => (
                          <span key={j} className={colorMap[token.type]}>
                            {token.text}
                          </span>
                        ))
                      )}
                    </div>
                  ))}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

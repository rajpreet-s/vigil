import React from 'react';

export default function HeroSection() {
    return (
        <section className="relative pt-section-desktop pb-section-desktop overflow-hidden px-md">
            {/* Ambient glow blobs */}
            <div className="hero-glow-element absolute -top-48 -right-48 w-[800px] h-[800px] pointer-events-none" />
            <div className="hero-glow-element absolute -bottom-48 -left-48 w-[600px] h-[600px] pointer-events-none opacity-30" />

            <div className="max-w-max-width mx-auto grid grid-cols-1 lg:grid-cols-2 gap-xl items-center relative z-10 section-reveal">
                {/* Left: copy */}
                <div className="text-left">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-xs px-sm py-xs border border-outline-variant rounded-full bg-surface-container-low mb-lg shadow-sm">
                        <span className="font-label-mono text-[10px] uppercase tracking-wider text-primary-container">
                            Open Source
                        </span>
                        <span className="w-1 h-1 rounded-full bg-outline" />
                        <span className="font-label-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
                            Prometheus &amp; Alertmanager
                        </span>
                    </div>

                    {/* Headline */}
                    <h1 className="font-display text-display metallic-text mb-md leading-tight">
                        Alert storms,
                        <br />
                        correlated.
                    </h1>

                    {/* Subheading */}
                    <p className="font-body-lg text-body-lg text-on-surface-variant mb-xl max-w-lg">
                        When one outage fires forty alerts, Vigil groups them into a single incident
                        with a causal timeline — delivered as one Slack message.
                    </p>

                    {/* CTAs */}
                    <div className="flex flex-col sm:flex-row gap-md sm:items-start items-center">
                        <button className="bg-primary-container text-on-primary-container px-xl py-md rounded-lg font-bold hover:brightness-110 transition-all flex items-center gap-sm shadow-lg shadow-primary-container/20">
                            Get Started
                            <span className="material-symbols-outlined">arrow_forward</span>
                        </button>
                        <a
                            href="https://github.com/rajpreet-s/vigil"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-sm px-xl py-md border border-outline-variant rounded-lg font-body-md text-on-surface hover:bg-surface-container-high transition-colors"
                        >
                            <span className="material-symbols-outlined">terminal</span>
                            View on GitHub
                        </a>
                    </div>

                    <p className="mt-lg font-label-mono text-xs text-on-surface-variant/60">
                        MIT licensed · self-hosted · not a SaaS
                    </p>
                </div>

                {/* Right: animated incident mockup */}
                <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden aspect-[4/3] flex flex-col shadow-2xl">
                    {/* Window chrome */}
                    <div className="bg-surface-container-high px-md py-sm flex justify-between items-center border-b border-outline-variant">
                        <div className="flex items-center gap-sm">
                            <div className="w-2 h-2 rounded-full bg-primary-container pulse-dot" />
                            <span className="font-label-mono text-xs text-on-surface-variant">
                                Vigil Engine — Active
                            </span>
                        </div>
                        <div className="flex gap-xs">
                            <div className="w-2 h-2 rounded-full bg-outline-variant" />
                            <div className="w-2 h-2 rounded-full bg-outline-variant" />
                            <div className="w-2 h-2 rounded-full bg-outline-variant" />
                        </div>
                    </div>

                    {/* Animated content */}
                    <div className="flex-grow p-lg relative overflow-hidden font-label-mono text-xs">
                        {/* Storm state */}
                        <div className="storm-animation absolute inset-0 p-lg flex flex-col gap-sm">
                            <div className="px-sm py-xs bg-error-container/20 border border-error/30 text-error rounded w-fit">
                                14:02 CRITICAL db-pool exhausted
                            </div>
                            <div className="px-sm py-xs bg-primary-container/10 border border-primary-container/30 text-primary-container rounded w-fit ml-4">
                                14:02 WARNING api-gateway latency
                            </div>
                            <div className="px-sm py-xs bg-primary-container/10 border border-primary-container/30 text-primary-container rounded w-fit ml-8">
                                14:03 WARNING checkout-service timeout
                            </div>
                            <div className="px-sm py-xs bg-error-container/20 border border-error/30 text-error rounded w-fit ml-2">
                                14:03 CRITICAL payment-worker 5xx
                            </div>
                            <div className="px-sm py-xs bg-primary-container/10 border border-primary-container/30 text-primary-container rounded w-fit ml-12">
                                14:04 WARNING lb-frontend healthcheck
                            </div>
                            <div className="px-sm py-xs bg-primary-container/10 border border-primary-container/30 text-primary-container rounded w-fit ml-16">
                                14:04 WARNING cart-service retry
                            </div>
                        </div>

                        {/* Correlated state */}
                        <div className="correlated-animation absolute inset-0 p-lg flex items-center justify-center">
                            <div className="w-full bg-surface-container-high border border-primary-container/40 rounded-lg p-md shadow-2xl">
                                <div className="flex items-center justify-between mb-sm">
                                    <span className="text-primary-container font-bold">
                                        1 incident — correlated from 40 alerts
                                    </span>
                                    <span className="text-on-surface-variant text-[10px]">
                                        #incidents
                                    </span>
                                </div>
                                <div className="text-[11px] text-on-surface-variant/80 mb-md border-b border-outline-variant pb-xs">
                                    Topology-filtered · causal timeline built
                                </div>
                                <div className="flex flex-col gap-xs">
                                    <div className="flex items-center gap-sm">
                                        <span className="px-xs py-[2px] bg-surface-container-lowest border border-outline-variant rounded">
                                            db-pool
                                        </span>
                                        <span className="material-symbols-outlined text-on-surface-variant text-sm">
                                            arrow_right_alt
                                        </span>
                                        <span className="px-xs py-[2px] bg-surface-container-lowest border border-outline-variant rounded">
                                            api-gateway
                                        </span>
                                        <span className="material-symbols-outlined text-on-surface-variant text-sm">
                                            arrow_right_alt
                                        </span>
                                        <span className="px-xs py-[2px] bg-surface-container-lowest border border-outline-variant rounded">
                                            checkout
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-on-surface-variant/60 mt-sm italic">
                                        # posted to Slack — one notification, not forty
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

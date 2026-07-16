---
name: Vigil
colors:
  surface: '#111318'
  surface-dim: '#111318'
  surface-bright: '#37393f'
  surface-container-lowest: '#0c0e13'
  surface-container-low: '#1a1b21'
  surface-container: '#1e1f25'
  surface-container-high: '#282a2f'
  surface-container-highest: '#33353a'
  on-surface: '#e2e2e9'
  on-surface-variant: '#d6c3af'
  inverse-surface: '#e2e2e9'
  inverse-on-surface: '#2e3036'
  outline: '#9e8e7c'
  outline-variant: '#514535'
  surface-tint: '#ffb956'
  primary: '#ffca85'
  on-primary: '#452b00'
  primary-container: '#f2a93b'
  on-primary-container: '#664000'
  inverse-primary: '#835400'
  secondary: '#c4c6cf'
  on-secondary: '#2d3037'
  secondary-container: '#44474e'
  on-secondary-container: '#b3b5bd'
  tertiary: '#ffc7ad'
  on-tertiary: '#552000'
  tertiary-container: '#ffa06f'
  on-tertiary-container: '#7c3200'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffddb5'
  primary-fixed-dim: '#ffb956'
  on-primary-fixed: '#2a1800'
  on-primary-fixed-variant: '#633f00'
  secondary-fixed: '#e1e2eb'
  secondary-fixed-dim: '#c4c6cf'
  on-secondary-fixed: '#191c22'
  on-secondary-fixed-variant: '#44474e'
  tertiary-fixed: '#ffdbcb'
  tertiary-fixed-dim: '#ffb692'
  on-tertiary-fixed: '#341100'
  on-tertiary-fixed-variant: '#793100'
  background: '#111318'
  on-background: '#e2e2e9'
  surface-variant: '#33353a'
typography:
  display:
    fontFamily: Space Grotesk
    fontSize: 49px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 39px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 31px
    fontWeight: '600'
    lineHeight: '1.2'
  body-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '400'
    lineHeight: '1.5'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  section-desktop: 96px
  section-mobile: 48px
  max-width: 1200px
---

# DESIGN.md — Vigil (v2)

**What changed from v1, and why:** the first pass was too flat/generic — restraint tipped into "no personality." This version keeps the brand's core idea (signal over noise, one accent used deliberately) but adds two techniques borrowed from references the founder pointed to: an ambient gradient glow (Evervault) and a metallic gradient headline treatment, plus a true dual dark/light mode (Rootly). Both are given a Vigil-specific reason to exist rather than copied wholesale — see section 1.

Note: an auto-generated Material You token dump was passed in alongside the v1 file (a `primary`/`tertiary`/`surface-dim` style palette seeded from the accent color). It wasn't adopted here — it's a generic theme-generator output, not a design decision, and its color relationships (cool blue tertiary, muted secondary) don't have a stated reason to exist. Everything below is chosen, not generated.

## 1. Visual theme and atmosphere

**Two states, one story: the vigil, and the dawn after it.**

- **Dark mode ("Vigil")** is the default — watching through an incident. Near-black canvas, warm ember glow, the sense of a terminal lit by one lamp at 2am.
- **Light mode ("Dawn")** is not a inverted-colors afterthought — it's the same brand after the storm has passed. Warm off-white (not clinical white), same amber DNA, calmer.
- The ambient gradient glow behind the hero and the metallic gradient headline text are both intentional, not decoration: they represent the lantern — a single warm light source in the dark. Use them in the hero only. Everywhere else, the flat/restrained v1 rules still apply.
- Still no purple, no glassmorphism, no "AI startup" gradient-everywhere treatment. The gradient exists in exactly two places (hero glow, headline text) — if it starts showing up elsewhere, that's scope creep on the design itself.

## 2. Color palette & roles

Two full token sets — dark and light — in the frontmatter above. Rules that apply to both:

| Token | Role |
|---|---|
| `background` → `surface` → `surface-raised` | Depth via layering, not shadows. Unchanged from v1. |
| `metallic-gradient` | Hero headline text-fill **only**. Never a background, never a button. |
| `glow-gradient` | One large, blurred, low-opacity radial glow behind the hero. Nowhere else. |
| `status-*` | Alert states inside the product mockup only. Never a design accent. |

Light mode isn't dark mode with colors swapped — it needed independent contrast tuning (status colors especially are darkened for AA contrast on a white surface).

## 3. Typography rules

Three roles now, each doing one job:

- **Display (headlines only): Space Grotesk**, 600 weight, tight tracking (-0.02em). Technical and geometric without being cold — this is what carries the metallic gradient fill. Used sparingly: hero headline and section titles only.
- **Body & UI: Inter**, 400/500/600. Everything else.
- **Data: JetBrains Mono** — real product output only (timelines, Slack mockup, install commands). Unchanged from v1.

Scale, weights, and line-height rules from v1 are unchanged.

## 4. Component stylings

Unchanged from v1 (flat cards, 1px borders, `radius: md` buttons, no shadows) — see original sections 4–6 below for full detail. The only addition: the hero product panel now shows two states — "storm" (scattered alert chips) and "correlated" (the single incident card) — crossfading on a slow loop. This is the page's signature element: it's the one place motion is doing real work, because it's visualizing the actual mechanism (topology-aware settle-timer grouping), not decorating the page.

- Crossfade cycle: ~9s, ease-in-out, pauses on hover, infinite loop.
- `prefers-reduced-motion`: freeze on the correlated state — no flashing crossfade for users who've asked to avoid it.

## 5. Layout principles

Unchanged from v1: 12-col grid, 1200px max width, left-aligned hero, one idea per section, 96px/48px section padding.

**Nav correction:** no "Pricing," no "Changelog," no "Integrations" — those imply a commercial product with a roadmap that doesn't exist yet. Nav is: logo, "How it works," GitHub, theme toggle, "Get Started" (→ install docs). Honest scope, honest nav.

## 6. Depth & elevation

Unchanged from v1 — background layering and 1px borders, no shadows, no skeuomorphism.

## 7. Do's and don'ts

**Do (new in v2):**
- Use the metallic gradient on the hero headline, and only there.
- Use the glow gradient once, behind the hero, blurred and low-opacity.
- Let light mode feel like a genuinely different time of day, not a palette-swap checkbox.

**Don't (carried over + reinforced):**
- Don't let the gradient migrate into buttons, cards, or nav.
- Don't claim product capabilities that don't exist (no "sub-50ms," no "eBPF integration" — say what the tool actually does).
- Don't add fake trust signals (customer avatars, "trusted by top-tier teams") — this is a solo OSS project. Replace with real signals: license, build status, GitHub stars.
- Still no purple, no globe/blob stock graphics, no centered hero.

## 8. Responsive behavior

Unchanged from v1. Nav simplifies to logo + GitHub + toggle + CTA below 768px (middle links hidden rather than a hamburger menu — fewer moving parts for a page this size).

## 9. Agent prompt guide

1. Pull tokens from the frontmatter — dark set by default, light set under `[data-theme="light"]`.
2. The gradient glow and metallic text are hero-only. If either shows up in a card or nav, that's a bug against this spec, not a style choice.
3. Every feature claim in copy must map to something in the real Vigil scope (topology-aware correlation, causal timeline, settle-timer grouping, single Slack delivery). No invented capabilities.

Example prompt: *"Build the Vigil hero using @DESIGN.md v2 — metallic gradient headline, ember glow behind it, and the storm→correlated crossfade panel on the right showing real alert-chip content, not placeholder text."*
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

# DESIGN.md — Vigil Landing Page & Marketing Site (v2)

This specification defines the visual language, design system, and component guidelines for Vigil's marketing website and landing page ([packages/web](file:///Users/raj/VSCode/vigil/packages/web)). 

> [!NOTE]
> For the SRE Incident Dashboard design guidelines (which manage active alert storms, LangGraph execution traces, and human-in-the-loop approvals), please see the separate dashboard specification: [packages/app/DESIGN.md](file:///Users/raj/VSCode/vigil/packages/app/DESIGN.md).

---

## 1. Visual Theme and Atmosphere

**Two states, one story: the vigil, and the dawn after it.**

- **Dark Mode ("Vigil")** is the default — watching through an incident. Near-black canvas, warm ember glow, representing a terminal lit by a single lamp at 2 AM.
- **Light Mode ("Dawn")** represents the brand after the incident has passed. Warm off-white (not clinical white), same amber DNA, calmer.
- The ambient gradient glow behind the hero and the metallic gradient headline text are both intentional, not decoration: they represent the "lantern" — a single warm light source in the dark. Use them in the hero only. Everywhere else, flat/restrained rules apply.
- No purple, no glassmorphism, no "AI startup" gradient-everywhere treatment. The gradient exists in exactly two places (hero glow, headline text) — if it starts showing up elsewhere, that is scope creep.

---

## 2. Color Palette & Roles

The design system uses the color tokens specified in the frontmatter above. The following roles apply to the marketing pages:

| Token | Role |
|---|---|
| `background` → `surface` → `surface-raised` | Depth via flat background layering, not shadows. |
| `metallic-gradient` | Hero headline text-fill **only**. Never a background, never a button. |
| `glow-gradient` | One large, blurred, low-opacity radial glow behind the hero. Nowhere else. |
| `status-*` | Alert states inside the landing page topology and code mockups only. Never a brand accent. |

*Note: Light mode is enabled via the `[data-theme="light"]` attribute, using dedicated contrast adjustments for AA compliance on off-white surfaces.*

---

## 3. Typography Rules

Three font families, each doing one job:

- **Display & Section Headers: Space Grotesk** (600 weight, tracking `-0.02em`). Technical and geometric without being clinical. This font carries the metallic gradient text fill. Used for the hero headline and major section titles only.
- **Body & UI Elements: Inter** (400/500/600 weights). Used for all body copy, navigation links, and standard interface elements.
- **Console & Code Blocks: JetBrains Mono** (400 weight). Used for real product output, terminal commands, configuration blocks, and file paths.

---

## 4. Component Stylings & Layout

- **Flat aesthetics**: Cards are styled with flat background containers (e.g. `bg-surface-container-low`), a `1px` border (`border-surface-container-high`), and a border radius of `md` (`0.75rem`). No dropshadows or skeuomorphism are allowed.
- **Signature Hero Mockup**: The hero section features an interactive mockup showcasing Alertmanager anomalies grouping into a single incident context. It loops between two states:
  1. *Storm state*: Scatter of raw alerts with active alert badges (`redis-down`, `api-5xx`, `db-connections`).
  2. *Correlated state*: A single, clean, correlated incident card displaying causal timeline connections.
  *Animation rules*: ~9s crossfade duration, ease-in-out transition, pauses on hover, respects `prefers-reduced-motion` media queries (falls back to the static correlated state).

---

## 5. Navigation & Layout Principles

- **Honest Navigation**: To reflect a real developer utility rather than a commercial product, the navigation links are strictly limited to: Logo, "How it works", GitHub link, Theme Toggle, and a "Get Started" call-to-action leading directly to the installation instructions. No "Pricing" or "Changelog" placeholders.
- **Grid System**: 12-column responsive layout, constrained to a `1200px` maximum width. Left-aligned typography in the hero with a balanced vertical layout.
- **Section Spacing**: Direct desktop padding of `96px` (`section-desktop`) and mobile padding of `48px` (`section-mobile`) to give code blocks and copy ample breathing room.

---

## 6. Do's and Don'ts

**Do:**
- Use the metallic gradient on the hero headline, and only there.
- Use the radial glow once, blurred and behind the hero, to represent the lantern.
- Ensure light mode feels like a warm, high-contrast, off-white dawn theme, not a clinical white palette-swap.

**Don't:**
- Don't let gradients leak into buttons, cards, list markers, or borders.
- Don't claim fake marketing metrics or non-existent features (no "eBPF native scraping"). Specify only what Vigil does: topology-aware correlation, settle-timer debouncing, ChromaDB runbook retrievals, and LangGraph-driven analysis.
- Don't use generic stock illustrations or AI blob SVGs. Use concrete technical mockups (topology nodes, code snippets, Slack message alerts).
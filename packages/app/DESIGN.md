---
name: Vigil SRE Incident Command Dashboard
colors:
  background: '#0c0e13'
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
  surface-tint: '#ffd98a'            # Aligned with primary Flame Gold
  
  # Semantic color hierarchy to resolve semantic amber conflicts
  primary: '#ffd98a'                 # Brand Flame Gold (Main CTAs and primary actions)
  on-primary: '#452b00'
  primary-container: '#ffddb5'
  on-primary-container: '#2a1800'
  
  secondary: '#c4c6cf'               # Muted slate secondary text/icons
  on-secondary: '#2d3037'
  secondary-container: '#44474e'
  on-secondary-container: '#b3b5bd'
  
  status-warning: '#f2a93b'          # Pure Warning Amber (Reserved strictly for Warnings & Settle-Timer)
  status-critical: '#ffb4ab'         # Crimson (Critical outages, error events)
  status-healthy: '#34d399'          # Emerald Green (High confidence calibration, success nodes)
  status-info: '#60a5fa'             # Slate Blue (Medium confidence, info/system logs)
  status-low-confidence: '#ff9c6e'   # Deep Coral-Amber (Low confidence fallback badge - distinct from Warning)
  
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
typography:
  display:
    fontFamily: Space Grotesk
    fontSize: 31px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.2'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.5'
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.5'
  label-mono-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
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
  max-width: 100%
---

# DESIGN.md — Vigil SRE Incident Command Dashboard (v3)

This specification defines the product thinking, UX workflows, accessibility requirements, and atomic component library for the Vigil SRE Incident Command Dashboard ([packages/app](file:///Users/raj/VSCode/vigil/packages/app)).

---

## 1. Product Thinking & Strategic Alignment

### 1.1 First-Class SRE Focus (No RAG/Doc-Intelligence Drift)
Vigil is **authoritatively an SRE Incident-Response Copilot** designed to sit between Prometheus/Alertmanager and operations teams. It correlates alerts, queries live metrics, and coordinates human-in-the-loop Slack resolutions. It is **not** a generic document intelligence or RAG tool. 

The vector database (ChromaDB) serves a strictly targeted SRE job: retrieving static runbook mitigation snippets based on the anomalous service's context to feed the final LLM prompt. The UI reflects this operational focus by prioritizing alert storms, causal graphs, metric streams, and runbook checklists.

### 1.2 Core User Journeys

#### Journey 1: Outage Ingestion & Real-Time Debounce (Operator Path)
- **Context**: A cluster-wide network partition occurs. Prometheus floods Alertmanager, firing 35 unique alerts.
- **The Flow**:
  1. The operator lands on the dashboard.
  2. The UI shows an active, accumulating alert storm card in the sidebar.
  3. A visual **Settle-Timer Progress Bar** (colored in amber `status-warning`) counts down from 60 seconds (debouncing). It resets dynamically when a new unique alert joins the storm (Decision #7).
  4. The UI displays the alert storm counting up: `12 alerts grouped... 24 alerts... 35 alerts.`
  5. When the timer hits 0, the state transitions dynamically to `Analyzing` as the LangGraph workflow triggers.
- **Value**: Visualizes settle-timer debounce logic, showing why Vigil delivers a single notification instead of a wall of pagers.

#### Journey 2: Human-in-the-Loop Incident Mitigation (Operator Path)
- **Context**: The agent completes correlation but requires validation before broadcasting an outage summary to the wider team.
- **The Flow**:
  1. The LangGraph run checkpoints to PostgreSQL and halts on `human_review` (Decision #5).
  2. The dashboard header alerts: `1 Action Pending Review`.
  3. Clicking the alert displays a draft editor showing a pre-filled markdown RCA report (Suspected cause, timeline, impact, and fix steps).
  4. The operator edits the text directly, then clicks **Approve & Broadcast**.
  5. The API resumes the checkpointed Postgres graph state, notifying Slack and closing the incident.
- **Value**: Exposes stateful, interruptible agent architectures to the user.

#### Journey 3: Agentic Reasoning & Evaluation Audit (Evaluator / Recruiter Path)
- **Context**: A technical evaluator wants to verify that the developer can write complex agentic logic and evaluate AI outputs.
- **The Flow**:
  1. The evaluator lands on the dashboard. If no active incidents exist, they click **"Trigger Simulated Outage"** to seed the demo.
  2. The **Split-Screen Incident View** is instantly visible, presenting the **Causal Timeline** side-by-side with the **LangGraph Agent Trace DAG** (zero deep clicks required).
  3. They inspect the DAG nodes. If the path took the low-confidence branch, they click `investigate` to view raw Prometheus tool-call JSON logs (Decision #2).
  4. They click the `retrieval` node to view ChromaDB runbook text matches alongside similarity scores.
  5. They click the sidebar's **Agent Eval Suite** tab to audit the evaluation history of the system, observing scores across the 5 dimensions.
- **Value**: Maximizes technical portfolio exposure instantly upon landing.

### 1.3 Jobs-to-be-Done (JTBD)

- **Technical Evaluator (Recruiter/EM)**:
  - *Job*: "Verify that this developer can design, observe, and evaluate stateful LLM pipelines (LangGraph states, Postgres checkpointers, Prometheus tool-loops) so I can hire them."
  - *Key UI Need*: Split-screen default layout showing the active Agent Trace DAG, readable tool logs, and the Agent Eval history page.
- **On-Call SRE (Actual Operator)**:
  - *Job*: "Triage alert storms, identify the root cause service, review relevant runbooks, and notify the team so I can restore service health."
  - *Key UI Need*: Dense layout, high-contrast indicators, editable draft form, and clear confirmation actions.

### 1.4 MVP Features vs. Deferrals

- **MVP Features (Included)**: Real-time settle-timer, causal timeline, split-screen LangGraph DAG explorer, low-confidence Prometheus console logs, ChromaDB semantic query playground, human interrupt draft form, and Agent Eval history page.
- **Deferred Features (Omitted)**: Visual topology YAML editor, UI-based runbook document indexer (runbooks remain a static corpus to maintain deterministic evals), and Prometheus time-series graph generator.

---

## 2. UX / Workflow & Real-Time Sync

### 2.1 Real-Time Synchronization Model
All real-time UI updates (alert grouping, settle-timer ticking, and LangGraph node executions) are driven by a **Server-Sent Events (SSE)** connection `/api/incidents/events` streaming directly from the Fastify backend. When an alert webhook arrives, the backend pushes an event to the client to update the count or reset the visual progress bar without client-side polling.

### 2.2 SSE Error, Disconnected, and Reconnecting States
To handle network drops gracefully (e.g., recruiter's WiFi or backend cold-starts):
- **Visual Badge**: The dashboard header displays a persistent connection state badge:
  - `[🟢 Connected]` (Green dot / `status-healthy`)
  - `[🟡 Reconnecting...]` (Pulsing amber dot / `status-warning`, attempts connection back-off retries every 5s)
  - `[🔴 Disconnected]` (Red dot / `status-critical`, shows manual "Retry Connection" action)
- **Banner / Toast Alert**: If the connection drops during an active incident, a banner slides down at the top of the UI: *"Real-time sync interrupted. Showing cached state. [Reconnect]"*.
- **Skeleton Loading States**: On initial mount, while waiting for the initial database load or backend handshake, components display animated shimmer skeletons (sidebar list items, details card, and graph nodes) rather than simple blank states or loaders.

### 2.3 Cold Landing & Demo Mode
To ensure recruiters don't land on a dead empty state, the dashboard features a **"Trigger Simulated Outage"** hero button on empty load. Clicking this button sends a simulated Alertmanager payload, visualizes the settle-timer counting down, groups the alerts, executes the LangGraph nodes, and pauses on `human_review` to guide the recruiter through the system.

---

### 2.4 Main Dashboard Split-Screen Layout (ASCII Wireframe)

The primary view merges incident details with the Agent Trace DAG to ensure high discoverability of the agentic orchestration.

```
+---------------------------------------------------------------------------------------------------+
|  VIGIL | Incidents Monitor  [🟢 Connected] [Live SSE Sync] [Trigger Simulated Outage ⚡]           |
+---------------------------------------------------------------------------------------------------+
| ACTIVE OUTAGES        | postgres-db-prod: Postgres Connection Pool Exhaustion                     |
|                       | Severity: [🔴 CRITICAL] | Source: postgres-db-prod | Status: [Reviewing]  |
| [inc-9283]            +----------------------------------------------------+----------------------+
| Postgres Pool Exhaust | SUSPECTED CAUSE & CAUSAL TIMELINE                  | ACTIVE AGENT TRACE   |
| Ingesting: 14 alerts  | API pool utilization spiked > 95% on db at 12:15.  |                      |
| Settle: [====    ] 5s |                                                    | [load]               |
|                       | Impacted Services: [api-service] [worker]          |   │                  |
| [inc-9279]            |                                                    | [correlate]          |
| Redis Repl Lag Spike  | Causal Timeline:                                   |   │                  |
| Status: [Reviewing]   | 12:15:30 [🔴 ERR] PostgresPoolUsage > 95%          |   ├─▶ [investigate]  |
| 5 alerts grouped      | 12:15:45 [🟡 WRN] WorkerDBConnectionFailure        |   ▼                  |
|                       | 12:16:12 [🟡 WRN] API Latency > 2000ms             | [*human_review*] 🌟  |
| [inc-9150]            +----------------------------------------------------+   │                  |
| CPU Spike on Worker   | DRAFT SLACK REPORT (EDITABLE)                      |   ▼                  |
| Status: [🟢 RESOLVED] | +------------------------------------------------+ | [notify]             |
| 8 alerts grouped      | | ## RCA: Pool exhaustion on PostgreSQL...       | |                      |
|                       | | - Suspected cause: batch worker connections.   | | Click node to inspect|
|                       | +------------------------------------------------+ | state variables.     |
|                       |                                                    +----------------------+
|                       | [Dismiss Incident ✖]                                 [Approve & Page 🚀]  |
+---------------------------------------------------------------------------------------------------+
```

*Note: In the wireframe above, `[*human_review*] 🌟` indicates the active node is suspended, with the `Approve & Page 🚀` CTA highlighted in Flame Gold. Clicking `Dismiss Incident ✖` opens a warning modal.*

---

### 2.5 Responsive Viewports & Drag Resizing (Adaptive Layout)
The split-screen 3-pane layout requires significant width. For smaller screens, the app dynamically adapts:
- **Large Screen (>= 1024px)**: Sidebar (left, 20% width), Main Incident View & Timeline (middle, 45% width), and Agent Trace DAG visualizer (right, 35% width).
- **Drag-to-Resize Panel**: On large viewports, operators can hover over the left border of the expanded Agent Trace column and click-and-drag to resize the panel's width manually between `220px` and `650px`. The CSS transition is temporarily disabled during drag tracking to prevent visual lag.
- **Tablet / Mobile (< 1024px)**: Stacks vertically or offers a tab-based bottom bar to navigate the sub-panels:
  - `[🚨 Alerts]` — shows active incidents sidebar.
  - `[📄 Timeline & Draft]` — shows the incident details and the draft slack publisher.
  - `[🕸️ Agent Trace]` — shows the interactive LangGraph tree visualizer.

---

### 2.6 Navigation & Sub-Pages

- **Incidents Monitor**: Split-screen triage control center.
- **Service Topology**: Static SVG render of `topology.yaml` showing health states and edge pathways.
- **Runbook KB**: ChromaDB collection viewer with a **"Semantic Query Playground"** where developers can type arbitrary terms (e.g. "replica lag") to inspect similarity results.
- **Agent Eval Suite**: Displays evaluation history.
  - *Evaluation Note*: The evaluation run charts can show scenarios with `Score: 0.0%` (e.g. `traffic_spike`). This is **intentional** to show a real scenario evaluation failure, demonstrating testing rigour and system calibration rather than all-green vanity metrics.

---

## 3. Visual Accents & Glass-Gradient System

To reconcile Material Design 3's high-density layout with the request for premium modern accents, we apply gradients and glass overlays selectively to "hero elements" within the app shell.

### 3.1 Premium Accent Rules
1. **Active LangGraph Node**: The executing or suspended node in the DAG is wrapped in a `1px` border gradient moving from `primary` to `status-info`, back-lit by a soft, glowing dropshadow (`box-shadow: 0 0 12px var(--primary-glow)`).
2. **Human-Review Draft Box**: Styled as a frosted glass pane using `backdrop-blur-md` and a semi-transparent surface wrapper (`bg-surface-container/60 border border-white/10`) to floatingly separate it from the solid background layout.
3. **Contrast Rules on Glass Panels**: To prevent readability/contrast loss over busy backgrounds, text inside frosted glass or draft inputs stays at **100% opacity off-white (`#e2e2e9`)**, maintaining WCAG AA compliance (4.5:1 minimum) at all times against the darkest background state.
4. **Status Indicators**: Pulsing connection status dots feature a translucent radial glow layer.

### 3.2 Color System & Confidence Level Calibration
To resolve semantic overlap, Amber/Orange is separated from primary brand actions:
- **Brand CTA / Main Buttons**: Flame Gold (`#ffd98a`) or Warm Amber text inside solid dark containers.
- **Warning severity & Settle-Timer**: Reserving Orange/Amber (`#f2a93b`) strictly for warnings.
- **High Confidence (>= 80%)**: Displayed in Emerald Green (`#34d399` text over `rgba(52, 211, 153, 0.1)` container) to suggest reliable auto-remediation viability.
- **Medium Confidence (60% to 79%)**: Displayed in Warning Yellow/Amber (`#f2a93b`) indicating manual verification is recommended.
- **Low Confidence (< 60%)**: Displayed in Critical Red/Crimson (`#ff6b6b`) to suggest immediate manual operator intervention is necessary.

---

## 4. Accessibility (a11y) Specifications

1. **Color-Independent Status**:
   - Status indicators must include textual brackets alongside colors:
     - `[🔴 CRITICAL]` / `[🟡 WARNING]` / `[🟢 RESOLVED]`
   - Confidence levels must state the text tier explicitly (`Confidence: HIGH [94%]`).
2. **LangGraph Keyboard Nav & Screen Reader Support**:
   - Visual node graphs are inherently difficult for assistive technologies.
   - **Alternative Table View**: The DAG panel features a clear toggle button: `[Switch to Accessible Table View]`.
   - Clicking this swaps the node visualizer for a standard table listing:
     - *Node Name | Status | Timestamp | Execution Time | Output Summary*
     - This table is structured using HTML semantic tags (`<table>`, `<th>`, `<td>`), is fully keyboard focusable, and is easily parsed by screen readers.
3. **Keyboard Focus Order**:
   - The focus flow through the 3-pane split screen must follow a logical reading hierarchy:
     - Nav Sidebar tab index ➔ Active Incident List items ➔ Incident Timeline details ➔ Markdown Editor text area ➔ Approve/Dismiss buttons ➔ Agent DAG nodes / fallback table nodes.

---

## 5. Atomic Component Inventory

### 5.1 Badges & Indicators

```
[🔴 CRITICAL]           bg: rgba(239, 68, 68, 0.1)      border: 1px border-red-500/20      text: #ffb4ab
[🟡 WARNING]            bg: rgba(242, 169, 59, 0.1)     border: 1px border-orange-500/20   text: #f2a93b
[🟢 RESOLVED]           bg: rgba(52, 211, 153, 0.1)     border: 1px border-emerald-500/20  text: #34d399

[Confidence: HIGH]      bg: rgba(52, 211, 153, 0.1)     border: 1px border-emerald-500/20  text: #34d399
[Confidence: MEDIUM]    bg: rgba(242, 169, 59, 0.1)     border: 1px border-orange-500/20   text: #f2a93b
[Confidence: LOW]       bg: rgba(239, 68, 68, 0.1)      border: 1px border-red-500/20      text: #ffb4ab
```

### 5.2 Button System
- **Primary CTA (`Approve & Page`)**: Solid Flame Gold background (`#ffd98a`), black text (`#452b00`). Hover: brightness scaling to `110%`. Focus: `2px` solid outline offset.
- **Secondary CTA (`Test Connection`)**: Glass-style transparent background, `1px` border (`border-outline-variant`), white text. Hover: `bg-surface-container-high/60`.
- **Destructive CTA (`Dismiss Incident`)**: Crimson text (`#ffb4ab`), transparent border. Hover: `bg-error-container/20`.
  - *Mitigation Step*: Clicking this button opens a modal confirming the action: `Are you sure you want to dismiss this incident? This action cannot be undone.` with `[Cancel]` and `[Yes, Dismiss Outage]` options to prevent accidental data loss.

### 5.3 Sidebar Incident-Card States
- **Default state**: Background `bg-surface-container-low`, border `1px border-outline-variant/30`, text colors secondary.
- **Hover state**: Background shifts to `bg-surface-container`, borders brighten.
- **Selected/Active state**: Border glows `1px border-primary` (Flame Gold), background gains subtle left gold border.

### 5.4 Textarea & Inputs
- Background: `bg-surface-container-lowest`
- Border: `1px border-outline-variant`
- Focus ring: `outline outline-2 outline-primary`

### 5.5 Tab & Switch Controls
- Capsule container (`bg-surface-container-lowest border border-outline-variant/30`).
- Active state pill: background `bg-surface-container-highest`, text white.
- Hover pill: text white/90.

### 5.6 Toast Alerts / Status Banners
- Banner: top-fixed, background `bg-surface-container-high/90 backdrop-blur-md`, border `1px border-outline-variant`.
- Dynamic toast: slides in bottom-right corner, auto-dismiss in 4s with a linear progress timebar tracker.

### 5.7 Technical Log Card
- Container: Background `#1a1b21` (Low), `1px` border using `outline-variant/60`.
- Text: Font `label-mono-sm` (`JetBrains Mono`, `11px`), line-height `1.5`, color `#c4c6cf`.
- Code tokens: Timestamps in gray (`#9e8e7c`), service scopes in gold (`#ffd98a`), status codes in green (`#34d399`) or red (`#ffb4ab`).

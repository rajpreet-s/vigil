<div align="center">

  <a href="https://github.com/rajpreet-s/vigil">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="user-files/vigil-logo-dark.svg">
      <source media="(prefers-color-scheme: light)" srcset="user-files/vigil-logo-light.svg">
      <img alt="Vigil" src="user-files/vigil-logo.svg" width="260" height="58">
    </picture>
  </a>

  <br />
  <br />

  **Topology-Aware Incident Correlation & Automated Root Cause Analysis for Prometheus & Alertmanager**

  [![Deploy Vigil to GKE](https://github.com/rajpreet-s/vigil/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/rajpreet-s/vigil/actions/workflows/deploy.yml)
  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![LangGraph](https://img.shields.io/badge/LangGraph.js-Agentic%20Workflow-863bff?style=flat-square)](https://langchain-ai.github.io/langgraphjs/)
  [![Google Gemini](https://img.shields.io/badge/LLM-Google%20Gemini-4E86F7?style=flat-square&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)
  [![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)

  <p align="center">
    <a href="#why-vigil">Why Vigil</a> •
    <a href="#key-features">Key Features</a> •
    <a href="#how-it-works">How It Works</a> •
    <a href="#quick-start">Quick Start</a> •
    <a href="#agent-evaluation">Agent Eval</a> •
    <a href="#design-decisions">Decisions</a>
  </p>

</div>

---

> When Prometheus/Alertmanager fires 30 alerts during an outage, Vigil groups them into a **single incident**, walks your **service dependency graph** to isolate the root cause, and delivers a structured **Q1/Q2/Q3/Q4 analysis** directly to Slack — eliminating 2am manual correlation.

<br />

<div align="center">
  <img src="user-files/dashboard.png" alt="Vigil Web App Dashboard" width="100%" style="border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.25);" />
  <p><em>Vigil Web App Dashboard — Live incident triage, causal graph visualization, and interactive RCA timeline.</em></p>
</div>

<br />

<div align="center">
  <img src="user-files/slack_output.png" alt="Vigil Slack Incident Notification" width="85%" style="border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.25);" />
  <p><em>Slack Incident Notification — Deterministic causal timeline, blast radius, and Gemini-synthesized fix steps.</em></p>
</div>

<br />

<div align="center">

| Core Stack | Technologies |
| :--- | :--- |
| **Backend & Ingestion** | TypeScript · Fastify · Prisma · PostgreSQL · OpenAPI / Swagger UI |
| **Agentic Workflow** | LangGraph.js · Google Gemini API · ChromaDB Vector Store |
| **Web Dashboard** | React (Vite) · Tailwind CSS · Topology Graph Visualizer |
| **Integrations** | Alertmanager Webhooks · Slack Web API & Block Kit Interactive Modals |

</div>

---

## Why Vigil?

I got tired of being woken up to 40 Slack pings that were all downstream symptoms of one Redis config change. The real problem isn't alert volume — it's that there is no system between **"alert fires"** and **"engineer figures out what happened."** On-call teams end up doing correlation manually, in their heads, under pressure, with incomplete context.

Vigil is that missing layer. It sits between Alertmanager and your team, grouping alerts by **causal topology** rather than timestamp alone.

| Traditional On-Call Pain | The Vigil Way |
| :--- | :--- |
| ❌ 40 disjointed alert notifications flooding your phone |  **Single incident thread** grouping all related alerts |
| ❌ Guessing which alert fired first amidst clock skews |  **Directed acyclic graph (DAG)** traversal identifies true root cause |
| ❌ Hunting through git history to see what deployed recently |  **Automated deploy correlation window** pinpoints suspicious changes |
| ❌ Searching through outdated wikis for runbooks at 2am |  **Semantic vector search (ChromaDB)** injects exact runbook steps |

> [!NOTE]
> **What Vigil is not:** A Datadog replacement, a generic APM platform, or a PagerDuty competitor. Vigil is a focused, high-precision incident correlation and RCA layer.

---

## Key Features

- **Topology-Aware Alert Correlation:** Groups alerts using your actual service dependency graph instead of naive time-window heuristics.
- **Automated Root Cause Analysis:** Generates structured Q1/Q2/Q3/Q4 RCA reports using Gemini over pre-correlated evidence packages.
- **Human-in-the-Loop Slack Workflow:** Sends private RCA review DMs with interactive *Approve* and *Dismiss* actions before posting to team channels.
- **Full Incident Management Dashboard:** Modern React web application for inspecting causal timelines, editing service topologies, managing runbooks, and reviewing evaluation runs.
- **Multi-Tenancy & RBAC:** Multi-tenant workspace isolation (Organizations, Roles, Invite Codes) with Google OAuth 2.0 sign-in.
- **Self-Documenting REST API:** Auto-generated Swagger / OpenAPI UI at `/docs` for all webhook and REST management endpoints.
- **Reproducible Evaluation Harness:** Offline benchmark suite scoring root cause accuracy, blast radius, confidence, and hallucination resistance.

---

## How It Works

### 1. The Correlation Problem

Naive alert grouping relies on sliding time windows: alerts that fire within $N$ seconds get lumped together. When your cache fails, your database spikes, and your HTTP gateway responds with 502s simultaneously, time proximity tells you they're related, but not *which one started the fire*.

Vigil uses your **service dependency topology**. When `redis` fails and `api_service` alerts 30 seconds later, the topology knows `api_service` depends on `redis`. The causal timeline runs in the correct order. Services alerting at the same time that share no dependency edges are cleanly partitioned.

```
       [ redis ] <--- ROOT CAUSE (Alert fired first)
           │
           ▼
     [ api_service ] <--- CASCADE
           │
           ▼
      [ frontend ] <--- USER IMPACT
```

When no topology is configured, Vigil falls back to temporal ordering and explicitly marks confidence as `LOW`.

### 2. The LLM's Job: Format, Don't Guess

> [!IMPORTANT]
> **Deterministic First, AI Second:** The LLM formats; it does not deduce. All causal reasoning happens in deterministic TypeScript before the model sees a single token.

The LLM receives a structured evidence package:
- Ordered causal timeline
- Subgraph of affected nodes
- Correlated deploy window events
- Retrieved runbook excerpts

From this package, the model formats the standard **Q1–Q4 incident report**:
- **Q1: What broke?** — High-level user impact and alerting services.
- **Q2: What caused it?** — Identified root cause component.
- **Q3: Did we cause it?** — Correlation with recent code deploys or config updates.
- **Q4: What do I do?** — Specific, context-aware remediation steps from runbooks.

---

## Quick Start

### Prerequisites

- **Node.js:** `v20+`
- **Docker & Docker Compose:** For running PostgreSQL and ChromaDB
- **Google Gemini API Key:** For evidence synthesis
- **Google OAuth 2.0 Credentials:** (Optional) for Dashboard authentication
- **Slack App:** With `chat:write` scope and a signing secret

### 1. Environment Setup

Clone the repository and copy the environment template:

```bash
git clone https://github.com/rajpreet-s/vigil.git
cd vigil
cp .env.example .env
```

Configure your `.env` credentials:

```bash
# Database & Vector DB
DATABASE_URL="postgresql://docker:admin@localhost:5433/vigil?schema=public"
CHROMA_URL="http://localhost:8000"

# LLM & Slack Credentials
GEMINI_API_KEY="your-gemini-api-key"
SLACK_BOT_TOKEN="xoxb-your-token"
SLACK_SIGNING_SECRET="your-signing-secret"
SLACK_ONCALL_USER_ID="U0123456789"
SLACK_INCIDENTS_CHANNEL="C0123456789"

# Auth & Frontend URL
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:8080/api/auth/google/callback"
JWT_SECRET="your-random-jwt-secret"
FRONTEND_URL="http://localhost:5174"
```

### 2. Start Services

```bash
# 1. Install dependencies
npm install

# 2. Spin up PostgreSQL and ChromaDB containers
npm run docker:up

# 3. Apply Prisma database schema & sync client
npm run db-sync

# 4. Seed vector embeddings for default runbooks
npm run chroma-setup

# 5. Start Fastify API (port 8080)
npm run start-api

# 6. Start LangGraph Agent worker (port 3001)
npm run start-agent

# 7. Start Incident Management Dashboard (port 5174)
npm run start-app

# 8. (Optional) Start Landing Page Web App (port 5173)
npm run start-web
```

### 3. Service Port Reference

| Service | Port | Description |
| :--- | :--- | :--- |
| **Web Dashboard** | [`http://localhost:5174`](http://localhost:5174) | Incident Command, Causal Explorer, Topology Manager |
| **Fastify API** | [`http://localhost:8080`](http://localhost:8080) | Ingestion Webhook (`/api/webhook`), Swagger UI (`/docs`) |
| **LangGraph Agent** | `http://localhost:3001` | Async incident reasoning and Slack dispatcher |
| **ChromaDB** | `http://localhost:8000` | Vector storage for embedded runbook chunks |
| **PostgreSQL** | `localhost:5433` | Primary relational datastore (Incidents, Orgs, Users) |

### 4. Topology Configuration

Define dependencies via the **Topology Manager** in the Web UI, or provide a `topology.yaml` in your workspace root:

```yaml
services:
  api_service:
    upstream: [redis, postgres]
  worker:
    upstream: [postgres, redis]
  frontend:
    upstream: [api_service]
```

---

## Agent Evaluation

Vigil includes a test harness under `packages/agent/eval/` to benchmark agent performance across recorded outage scenarios without needing a live cluster:

```bash
npm run agent-eval
```

### Benchmark Scenarios

- `db_exhaustion`: Connection pool saturation cascading to API timeouts.
- `redis_outage`: Cache evictions triggering backend load spikes.
- `traffic_spike`: Ingress overload causing queue backpressure.
- `disk_full`: Logging volume fills disk on worker nodes.
- `ghost_incident`: Flapping synthetic alerts with no real cause (evaluates false positive resistance).

### Evaluation Rubric

| Metric | Weight | Target |
| :--- | :---: | :--- |
| **Root Cause Accuracy** | 40% | Exact match on root cause service |
| **Cascade Completeness** | 20% | Correct identification of affected downstream services |
| **Confidence Calibration** | 15% | Penalizes overconfidence when topology is absent |
| **Fix Relevance** | 15% | Matching actionable runbook instructions |
| **Absence of Hallucinations** | 10% | Zero references to unobserved metrics or services |

*The harness detects `AGENT_EVAL=true` and automatically routes calls to `gemini-flash-lite` to keep evaluation fast and cost-effective.*

---

## Project Status

- [x] **Alert Ingestion Pipeline:** Alertmanager webhook receiver with debouncing settle-timer.
- [x] **Deterministic Graph Engine:** DAG traversal over user-defined topology.
- [x] **LLM Evidence Synthesis:** Structured Q1–Q4 RCA generation with Gemini.
- [x] **Slack Human-in-the-Loop:** Interactive approval cards with channel broadcast.
- [x] **Incident Dashboard:** Real-time web UI with topology editor & incident timeline.
- [x] **Multi-Tenancy & Auth:** Google OAuth 2.0, workspace organizations, and invite codes.
- [x] **Evaluation Benchmark:** Automated 7-scenario evaluation harness with metric scoring.

---

## Design Decisions

Why topology-aware correlation instead of sliding time windows? Why ChromaDB over pgvector? Why does the LLM execute only once?

Read the rationale behind every major architectural choice in **[DECISIONS.md](DECISIONS.md)**.

---

## Contributing

Contributions, bug reports, and discussion are welcome! Please open an issue first before submitting PRs for significant changes.

For evaluation dataset additions: new test scenarios in `packages/agent/eval/test-cases/` are always appreciated. Follow the schema of existing cases and include a `ground_truth` block.

---

## License

Released under the [MIT License](LICENSE).

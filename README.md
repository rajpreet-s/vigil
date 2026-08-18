# Vigil

When Prometheus/Alertmanager fires 30 alerts for one outage, Vigil groups them into a single incident, walks the service dependency graph to find the actual root cause, and posts a structured Q1/Q2/Q3/Q4 analysis to Slack — so you're not manually correlating at 2am.

![Vigil Web App Dashboard](user-files/dashboard.png)

![Vigil Slack incident output showing a causal timeline and fix steps](user-files/slack_output.png)

**Stack:** TypeScript · LangGraph.js · Fastify · Prisma · PostgreSQL · React (Vite & Tailwind CSS) · ChromaDB · OpenAPI/Swagger · Slack Web API · Gemini

---

## Why this exists

I got tired of being woken up to 40 Slack pings that were all downstream symptoms of one Redis config change. The real problem isn't alert volume — it's that there's no system between "alert fires" and "engineer figures out what happened." You end up doing the correlation manually, in your head, at 3am, with incomplete information.

Vigil is that system. It sits between Alertmanager and your team, groups alerts by causal relationship rather than timestamp, and hands the on-call engineer a structured analysis instead of a wall of noise.

**What Vigil is not:** a Datadog replacement, a general observability platform, or a PagerDuty competitor. It's a focused incident correlation and RCA layer. That's a deliberate scope decision, not a limitation — the alternative is either building something nobody finishes or building something nobody uses.

---

## Key Features

- **Topology-Aware Alert Correlation:** Groups alerts using your actual service graph rather than naive time windows.
- **Automated Root Cause Analysis:** Generates structured Q1/Q2/Q3/Q4 RCA reports using Gemini LLM over pre-correlated evidence packages.
- **Human-in-the-Loop Slack Workflow:** Sends RCA DMs with interactive Approve/Dismiss actions before public channel broadcast.
- **Incident Management Web Dashboard:** Full React app for incident triaging, causal timeline exploration, topology editing, runbook management, and eval results.
- **Multi-Tenancy & Authentication:** Multi-tenant workspace isolation (Organizations, Roles, Invite Codes) with Google OAuth 2.0 sign-in.
- **Interactive OpenAPI Documentation:** Auto-generated Swagger UI for all REST and Webhook endpoints at `/docs`.
- **Automated Agent Evaluation Harness:** Benchmark pipeline scoring root cause accuracy, blast radius, confidence, and hallucination resistance.

---

## How it works

### The correlation problem

Naive alert grouping uses time windows: alerts within N seconds of each other get bucketed together. This works until your payment service, cache, and API all alert at once — time proximity tells you they're related, not which one caused the others.

Vigil uses your service topology instead. When `redis` goes down and `api_service` starts spiking 30 seconds later, the topology graph already knows `api_service` depends on `redis`. The causal timeline runs in the right order. Services that happen to alert at the same time but share no dependency edge get dropped — they fired by coincidence, not causation.

When no topology is configured, Vigil falls back to temporal ordering and flags `LOW` confidence so the analysis node knows it's working with less information.

### The LLM's job

The LLM formats, it does not reason. All structural reasoning — which service is the root cause, what the confidence is, whether a deploy preceded the incident — happens in deterministic TypeScript before the LLM sees a single token. The LLM receives a pre-built evidence package (causal timeline, topology subgraph, deploy correlation window, runbook chunks) and produces four answers: what broke, what caused it, did we cause it, what do I do. It does not make routing decisions. It does not call tools. It writes.

This is intentional. The `correlate_node` runs a decision tree with explicit confidence tiers (`HIGH` / `MEDIUM` / `LOW`). The `investigate_node` runs only on `LOW` confidence paths. The LLM executes once, after everything deterministic has already run.

## Running it

### Prerequisites

- Node.js 20+
- Docker + Docker Compose
- A Google Gemini API key
- Google OAuth 2.0 credentials (for user sign-in & web app dashboard)
- A Slack app with `chat:write` scope and a signing secret

### Environment variables

Copy `.env.example` to `.env` and fill in:

```bash
# Database & Vector DB
DATABASE_URL=postgresql://docker:admin@localhost:5433/vigil?schema=public
CHROMA_URL=http://localhost:8000

# LLM & Integration Credentials
GEMINI_API_KEY=your_key_here
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
SLACK_ONCALL_USER_ID=U...     # Slack user ID for on-call DMs
SLACK_INCIDENTS_CHANNEL=C...  # Channel ID for public RCA posts

# Google OAuth & Sessions
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8080/api/auth/google/callback
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:5174
```

### Start Services

```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL + ChromaDB containers
npm run docker:up

# 3. Apply DB migrations & sync client
npm run db-sync

# 4. Seed runbook vector embeddings
npm run chroma-setup

# 5. Start Fastify API server (port 8080 with Swagger UI at /docs)
npm run start-api

# 6. Start LangGraph agent listener (port 3001)
npm run start-agent

# 7. Start Incident Management Web App Dashboard (port 5174)
npm run start-app

# 8. (Optional) Start Landing Page Web Application
npm run start-web
```

Point Alertmanager at `http://localhost:8080/api/webhook`. Open `http://localhost:5174` for the Incident Dashboard and `http://localhost:8080/docs` for API documentation.

### Topology Configuration

Define service dependency graphs via the Web UI Topology Manager or drop a `topology.yaml` at the project root. Without topology, Vigil runs in temporal-only mode with a `LOW` confidence baseline.

```yaml
# topology.yaml
services:
    api_service:
        upstream: [redis, postgres]
    worker:
        upstream: [postgres, redis]
    frontend:
        upstream: [api_service]
```

---

## Agent evaluation

The eval suite under `packages/agent/eval/` runs the full agent pipeline against recorded scenarios without requiring a live deployment:

```bash
npm run agent-eval
```

Scenarios: `db_exhaustion`, `redis_outage`, `traffic_spike`, `disk_full`, `ghost_incident` (alerts with no real cause — tests false positive resistance).

Each run scores across five dimensions:

| Metric                              | Weight |
| ----------------------------------- | ------ |
| Root cause accuracy                 | 40%    |
| Cascade / blast radius completeness | 20%    |
| Confidence calibration              | 15%    |
| Fix action relevance                | 15%    |
| Absence of hallucinations           | 10%    |

The eval harness detects `AGENT_EVAL=true` and switches to the faster/cheaper `gemini-flash-lite` model so iteration doesn't burn quota.

---

## Current status

The core pipeline and user interface are complete:

- **Incident Engine:** Alert ingestion → topology-aware correlation → RCA → human review interrupt → Slack broadcast.
- **Incident Dashboard:** React Web App for viewing live incidents, investigating root cause timelines, visualizing/editing topologies, and managing runbooks.
- **Multi-Tenancy & Auth:** Google OAuth 2.0 authentication, session management, organization creation/joining, and workspace isolation.
- **API Documentation:** Interactive Swagger UI active at `http://localhost:8080/docs`.
- **Evaluation Suite:** Automated scoring harness for LLM RCA evaluation across 7 test cases.

What's deferred:

- **Production hardening** — the settle timer and hard incident duration cap are configurable constants but the defaults are tuned for local development.
- **Alertmanager native receiver** — currently expects a JSON webhook body matching Prometheus alert format. Advanced routing configuration docs are coming soon.

---

## Design decisions

The non-obvious choices — why topology-aware correlation instead of naive bucketing, why the LLM only runs once, how disconnected subgraphs are handled, why ChromaDB over pgvector — are documented in [DECISIONS.md](DECISIONS.md). Worth reading if you're evaluating the architecture or want to contribute.

---

## Contributing

This is a personal project in active development. If you find a bug or want to propose something, open an issue first — PRs without prior discussion are likely to conflict with work already in progress.

For eval contributions: new test cases in `packages/agent/eval/test-cases/` are always welcome. Match the JSON schema of existing cases and include a `ground_truth` block.

---

## License

MIT. See [LICENSE](LICENSE).

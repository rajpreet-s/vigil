# Architectural Decisions

These are the non-obvious choices made while building Vigil, and the reasoning behind them. Some of these were obvious in hindsight, some weren't. Writing them down because the decisions themselves are the interesting part — anyone can read code, but the reasoning behind it is usually lost.

---

## 1. Multi-signal correlation over rigid 1-hop topology or naive time bucketing

**Decision:** Group alerts by service dependency reachability first (transitive k-hop traversal up to 3 hops). When topology edges are missing or unmapped, fall back to shared infrastructure context (Kubernetes namespace, cluster, node) and temporal burst windows, rather than creating fragmented 1-alert incidents.

**Why:** Real-world topologies configured by users often have missing edges, subtle naming variations (e.g. `checkout` vs `checkout-service`), or multi-hop cascades ($A \rightarrow B \rightarrow C$ where intermediate service $B$ never alerted).
A rigid 1-hop check treated any missing edge as absolute proof of isolation, causing alert storms to fragment into multiple duplicate incidents. Furthermore, alerts arriving during `PROCESSING` or `PENDING_REVIEW` states must append to the active incident blast radius rather than opening duplicate root incidents.

The `IncidentCoordinator` uses a multi-signal scoring engine:
- Direct 1-hop edge (score 1.0)
- Transitive 2-hop / 3-hop dependency reachability (score 0.85 / 0.70)
- Shared infrastructure context (namespace, cluster, node from Prometheus labels, score 0.60–0.90)
- Simultaneous burst proximity (< 3 minutes during active incident)

**Tradeoff:** Allows alerts to join an incident even when user topology is partially defined or incomplete. The AI reasoning layer in `rca_node` then evaluates the refined causal timeline and blast radius.

---

## 2. Confidence tiers instead of a binary yes/no

**Decision:** `correlate_node` produces `HIGH`, `MEDIUM`, or `LOW` confidence alongside its root cause candidate, rather than a single best guess.

**Why:** The right next step depends on how sure we are. `HIGH` means: topology exists, we found the earliest service in the causal chain, and nothing upstream of it is also anomalous — this service can't blame anyone. `MEDIUM` means: we have a candidate but something upstream is also anomalous, or we had no topology. `LOW` means: no topology, multiple services, pure temporal ordering.

The confidence tier drives a conditional edge in the LangGraph workflow:
- `LOW` → `investigate_node` runs first (tool-calling loop, metric queries) to gather supplemental evidence before the LLM call
- `MEDIUM`/`HIGH` → skip straight to `retrieval` → `rca`

Without tiers, you'd either always run the expensive investigate path (slow, wasteful) or never run it (leaves ambiguous cases unresolved).

---

## 3. The LLM runs once, at the end, on pre-built evidence

**Decision:** `rca_node` is a single LLM call with a structured prompt. It does not call tools, does not loop, does not make routing decisions.

**Why:** Agentic reasoning on undifferentiated alert noise produces confident-sounding hallucinations. The LLM doesn't know your service topology, your deploy cadence, or which metric spike preceded which. Deterministic code does. So: the `correlate_node` builds the causal timeline. The `correlate_node` picks the root cause candidate. The `correlate_node` calculates confidence. The deploy correlation runs against a fixed 30-minute window in TypeScript. The runbook retrieval happens in ChromaDB before the LLM is called. By the time `rca_node` runs, it has a structured evidence package and its only job is to write four coherent answers from it.

The `investigate_node` is the exception — it does use a tool-calling loop. But it runs only on `LOW` confidence paths where there genuinely isn't enough structured evidence yet, and its job is to gather that evidence (Prometheus metric queries), not to reason about the incident. The LLM still gets the investigation findings as structured text, not as raw tool outputs.

---

## 4. Disconnected subgraph handling: transitive reachability preservation

**Decision:** In `buildCausalTimeline`, anomalies connected by direct or transitive dependency paths (including multi-hop dependencies where intermediate services didn't alert) are retained in the causal timeline. Only services with zero topological or structural path to the rest of the incident are pruned.

**Why:** In cascading outages ($A \rightarrow B \rightarrow C$), intermediate service $B$ may be resilient or lack an alert rule. Dropping $A$ and $C$ because $B$ did not alert was a false negative. Transitive BFS traversal retains valid causal chains while dropping true coincidences.

The dropped services remain in the incident database record (for blast radius visibility) but are kept out of the core causal narrative to maintain high signal for the LLM.

The edge case: if the topology graph exists but *every* service in the incident ends up isolated (no anomalous neighbors for anyone), `buildCausalTimeline` returns an empty array. `pickRootCause` detects this and falls back to the earliest raw anomaly at `MEDIUM` confidence.

---

## 5. PostgreSQL for graph checkpointing, not Redis

**Decision:** Use `@langchain/langgraph-checkpoint-postgres` for LangGraph state persistence. PostgreSQL is already a dependency (Prisma); Redis is not.

**Why:** The human-in-the-loop interrupt pattern requires durable state. When `human_review_node` calls `interrupt()`, the graph suspends and checkpoints everything. The resume can happen seconds or hours later when the engineer clicks Approve in Slack. That checkpoint needs to survive a process restart.

Redis would be faster but adds an infrastructure dependency for no real benefit — the checkpoint read/write is not on the hot path. The graph runs once per incident, not per request. PostgreSQL is already running, already managed, already backed up (in any real deployment). Adding Redis just to checkpoint a handful of graph states per hour would be the definition of premature optimization.

---

## 6. ChromaDB for runbook vectors over pgvector

**Decision:** Run ChromaDB as a separate Docker service for semantic runbook search rather than using the `pgvector` PostgreSQL extension.

**Why:** Primarily operational simplicity during development. The ChromaDB container gives a clean separation between incident data (Prisma-managed Postgres) and runbook embeddings (ChromaDB). The embedding model, collection management, and similarity search are all self-contained.

The tradeoff is an extra container. For a production deployment this is a legitimate concern — pgvector would eliminate it. The abstraction is thin enough that switching would be a localized change in `retrieval_node.ts` and `chroma/seed.ts`. This is on the deferred list.

---

## 7. Settle timer pattern over immediate trigger

**Decision:** When an alert arrives and joins an incident, reset a debounce timer. Only trigger the LangGraph workflow when the timer expires (alerts have gone quiet).

**Why:** Alert storms don't arrive atomically. When `redis` goes down, Alertmanager fires `RedisDown` at t=0, then `api_service` cache miss alerts start at t=30s, then latency alerts at t=50s. If the workflow triggered on the first alert, the `load_node` would only see one anomaly and the causal timeline would be meaningless. The settle timer waits for the storm to stabilize before analysis begins.

The timer resets on each new alert joining the incident. There's also a hard maximum duration cap so a pathological storm that never settles still eventually triggers analysis rather than blocking the incident indefinitely.

---

## 8. Cutting the scraper, ChromaDB auto-ingestion, and LLM-only RCA

**Decision:** Early prototypes included a Prometheus metric scraper running on a cron, automatic runbook ingestion from external URLs, and an experimental path where the LLM reasoned directly from raw alert payloads without structured correlation first.

All three were cut.

**Why:** The scraper added complexity (polling, deduplication, alert state management) that duplicated what Alertmanager already handles. Alertmanager is better at being Alertmanager. The auto-ingestion pipeline made the runbook corpus non-deterministic — you can't eval against a corpus that changes on its own. The LLM-only RCA path consistently underperformed the structured correlation approach on the eval scenarios, particularly on multi-service cascades where temporal ordering alone was insufficient.

Cutting all three made the eval suite more deterministic, the architecture easier to reason about, and the scope honest about what the project actually does well.

# Memory Pressure — Investigation Runbook

**Applies to:** All services  
**Severity trigger:** `memory_usage_percent` > 85%  
**Last updated:** 2026-04-01

---

## Symptoms

- `memory_usage_percent` above 85%.
- OOM Killer activating: check `dmesg | grep -i "oom"` or Kubernetes pod restart events.
- Increasing swap usage on non-containerised systems.
- Gradual performance degradation over hours (indicative of a memory leak).
- Pod CrashLoopBackOff with reason `OOMKilled`.

---

## Immediate Actions

### Step 1 — Identify memory consumers

```bash
ps aux --sort=-%mem | head -15
```

For container environments:

```bash
kubectl top pods --sort-by=memory
```

### Step 2 — Check if the growth is gradual (leak) or sudden (spike)

**Gradual:** RSS memory of a process growing steadily over hours → likely a memory leak introduced by a recent deploy. Check deploy timeline against the Prometheus `memory_usage_percent` graph.

**Sudden spike:** Correlate with `request_rate`. A traffic surge or bulk data processing job (import, report generation) can cause sudden memory spikes that are not leaks.

### Step 3 — Check for swap usage

On bare metal or VMs:

```bash
free -h
vmstat -s | grep -i swap
```

Heavy swap usage causes severe latency even if the process has not been OOM-killed yet.

### Step 4 — Review recent deploys

```bash
git log --since="24 hours ago" --oneline
```

A new version that loads a large dataset into memory, or removes a previously working cache expiry, is a common cause.

### Step 5 — Check Kubernetes memory limits and OOM events

```bash
kubectl describe pod <pod-name> | grep -A10 "OOMKilled\|Limits\|Last State"
```

If `Last State: Terminated` with reason `OOMKilled`, the limit is too low or there is a genuine leak.

---

## Root Cause Patterns

| Pattern | Signal | Action |
|---|---|---|
| Memory leak | Slow linear growth in Prometheus RSS graph | Restart pod, then fix in code |
| No memory limit set | Container uses all host memory | Set `resources.limits.memory` in deployment |
| Limit too low for workload | OOMKilled repeatedly, memory usage normal | Increase limit, then profile to optimise |
| Large batch job | Single spike correlated with job execution | Add memory profiling to job, or schedule off-peak |
| Cache without eviction policy | Monotonic growth, cache-related metrics rising | Add TTL or max-size to cache config |

---

## Emergency Mitigation

If OOM kill is imminent and data loss is acceptable, restart the lowest-priority pod first:

```bash
kubectl rollout restart deployment/<service-name>
```

This releases all memory immediately. The process re-initialises cleanly.

**Do not** restart the database pod under memory pressure without consulting the database team — PostgreSQL uses shared_buffers aggressively, and a forced restart may corrupt in-progress transactions.

---

## Escalation

If memory does not stabilise within 10 minutes of restart, the leak is reproducing on startup. Roll back the most recent deploy:

```bash
kubectl rollout undo deployment/<service-name>
```

---

## Prevention

- Always set `resources.requests.memory` and `resources.limits.memory` in Kubernetes manifests.
- Run memory profiling (e.g. `heaptrack`, `pprof`) in staging before deploying memory-intensive changes.
- Set cache size limits: never use unbounded in-memory caches in production.
- Monitor `memory_usage_percent`; alert at 75%, page at 88%.

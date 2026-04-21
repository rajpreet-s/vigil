# High CPU Usage — Investigation Runbook

**Applies to:** All services  
**Severity trigger:** `cpu_usage_percent` > 85% sustained for > 2 minutes  
**Last updated:** 2026-04-01

---

## Symptoms

- CPU usage sustained above 85% for more than 2 minutes.
- API response times increasing (P99 latency climbing).
- Pod restarts or OOMKilled events in Kubernetes.
- Downstream services beginning to time out.

---

## Immediate Actions

### Step 1 — Identify the top consuming process

```bash
top -bn1 | head -20
```

Or for a snapshot without interactive mode:

```bash
ps aux --sort=-%cpu | head -15
```

### Step 2 — Check for runaway threads

```bash
ps -eLf | sort -rn -k 4 | head -10
```

Look for a single process with unusually high thread count or CPU time.

### Step 3 — Check scheduled jobs

A cron job that fired at the same time is a common cause during off-hours spikes.

```bash
crontab -l
cat /var/log/cron | tail -50
```

### Step 4 — Check for recent deploy

Review deploy events near the `first_bad_timestamp`. A new build with an inefficient algorithm or missing cache will show as a sustained spike, not a flash.

```bash
git log --since="2 hours ago" --oneline
```

### Step 5 — Kubernetes pod inspection (if applicable)

```bash
kubectl top pods --sort-by=cpu
kubectl describe pod <pod-name> | grep -A5 "Limits\|Requests"
```

---

## Root Cause Patterns

| Pattern | Signal | Action |
|---|---|---|
| Runaway process | Single PID consuming > 80% | Kill and restart the process |
| Missing connection pool | Many processes each at ~20% | Review pool config |
| Infinite loop introduced by deploy | Spike starts exactly at deploy time | Rollback |
| Scheduled batch job | Spike is periodic, predictable | Reschedule or add resource limits |
| Traffic spike (legitimate load) | `request_rate` also elevated | Scale horizontally |

---

## Escalation

If CPU does not drop within 5 minutes of the targeted action above, escalate to the infrastructure team.  
If a runaway process cannot be safely killed, trigger a controlled pod restart:

```bash
kubectl rollout restart deployment/<service-name>
```

---

## Prevention

- Set `resources.limits.cpu` in Kubernetes manifests.
- Add CPU-based HPA (Horizontal Pod Autoscaler) with a target of 70%.
- Profile new code that processes large datasets before merging.

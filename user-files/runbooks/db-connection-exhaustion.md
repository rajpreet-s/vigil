# Database Connection Exhaustion — Investigation Runbook

**Applies to:** `postgresql`  
**Severity trigger:** `db_connections` > 90% of `max_connections`  
**Last updated:** 2026-04-01

---

## Symptoms

- `db_connections` metric approaching or exceeding `max_connections`.
- API services returning HTTP 500 errors or connection timeout responses.
- Error logs showing: `FATAL: remaining connection slots are reserved for non-replication superuser connections`.
- P99 latency on database-backed endpoints climbing sharply.

---

## Immediate Actions

### Step 1 — Check active connection count and state

```sql
SELECT count(*), state
FROM pg_stat_activity
GROUP BY state
ORDER BY count DESC;
```

Expected in a healthy system:
- `active`: < 20% of `max_connections`
- `idle`: connection pool connections waiting for work (acceptable)
- `idle in transaction`: ⚠️ these hold locks — investigate immediately

### Step 2 — Identify long-running queries

```sql
SELECT
  pid,
  now() - query_start AS duration,
  state,
  wait_event_type,
  wait_event,
  left(query, 100) AS query_snippet
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC
LIMIT 20;
```

Queries running for > 30 seconds during an incident are suspects.

### Step 3 — Identify idle-in-transaction connections

These hold locks and block other queries without doing work.

```sql
SELECT pid, now() - state_change AS idle_duration, application_name
FROM pg_stat_activity
WHERE state = 'idle in transaction'
ORDER BY idle_duration DESC;
```

### Step 4 — Terminate blocking queries (if safe)

Only terminate if the query is not a critical write in progress:

```sql
SELECT pg_terminate_backend(<pid>);
```

To terminate all idle-in-transaction connections older than 5 minutes:

```sql
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND now() - state_change > interval '5 minutes';
```

### Step 5 — Check `max_connections` setting

```sql
SHOW max_connections;
```

If the value is low (< 100) for the number of application instances connecting, consider increasing it in `postgresql.conf` and restarting. Note: increasing `max_connections` reduces shared memory available per connection.

---

## Root Cause Patterns

| Pattern | Signal | Action |
|---|---|---|
| No connection pool | Each request opens a new connection | Add PgBouncer or app-level pooling |
| Pool exhaustion | Pool size < expected concurrent requests | Increase pool `max` in app config |
| Idle-in-transaction leak | Many `idle in transaction` rows | Fix transaction management in app code |
| Traffic spike | `request_rate` also elevated | Temporarily scale app pods |
| Long-running migration | One very long `active` query | Wait if intentional, or terminate if runaway |

---

## Escalation

If connection count does not drop within 5 minutes of terminating long-running queries, the root cause is likely a connection pool misconfiguration. Engage the backend team to review pool settings.

For immediate relief, restart the API service pods — this releases all idle connections held by that deployment:

```bash
kubectl rollout restart deployment/<api-service-name>
```

---

## Prevention

- Use PgBouncer in transaction mode between the application and PostgreSQL.
- Set `idle_in_transaction_session_timeout = '5min'` in `postgresql.conf`.
- Monitor `db_connections / max_connections` ratio; alert at 70%, page at 90%.
- Load test before any deploy that changes query patterns.

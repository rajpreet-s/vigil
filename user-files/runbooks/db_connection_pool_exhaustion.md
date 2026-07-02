# SRE Runbook: PostgreSQL Connection Pool Exhaustion

**Alerts Handled:** `PostgresConnectionPoolHigh`, `PostgresConnectionPoolExhausted`, `PostgresHighQueryLatency`
**Severity:** P1 / Critical (when exhausted)
**Topology Component:** `postgresql` (job: `postgres_exporter`)
**Downstream Impact:** `api_service` (job: `node_api`, service: `api`) experiencing high latency/5xx errors, leading to `nginx` (job: `nginx`) returning 502/504 Bad Gateway errors.

---

## 📋 Description
This runbook describes the remediation steps for database connection pool saturation on the primary PostgreSQL instance. When active connections approach or reach `max_connections`, new backend clients (such as the Node.js API) will fail to acquire connections, blocking request execution and triggering cascading HTTP 5xx errors upstream.

---

## 🔎 Step-by-Step Triage & Diagnosis

### 1. Confirm the Alert and Active Connections
Identify whether the active connections are truly exhausting the pool limit.
Run the following SQL on the PostgreSQL primary instance:
```sql
SELECT 
    count(*)::float / (SELECT setting::float FROM pg_settings WHERE name = 'max_connections') * 100 AS connection_utilization_pct,
    count(*) AS active_connections,
    (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') AS max_limit
FROM pg_stat_activity
WHERE state IS NOT NULL;
```

### 2. Identify the Top Connection Sources
Determine which applications, hosts, or users are holding the most connections:
```sql
SELECT usename, client_addr, application_name, count(*), state
FROM pg_stat_activity
GROUP BY usename, client_addr, application_name, state
ORDER BY count(*) DESC;
```

### 3. Check for Long-Running or Blocked Queries
Check if queries are stuck in `active` state or waiting on locks:
```sql
SELECT pid, age(clock_timestamp(), query_start), state, usename, query, wait_event_type, wait_event
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY age DESC;
```

---

## 🛠️ Mitigation & Resolution

### Option A: Terminate Rogue / Long-Running Queries (Immediate Relief)
If there is a subset of queries holding locks or taking too long, terminate their connections:
```sql
-- Terminate a specific backend PID
SELECT pg_terminate_backend(PID_HERE);

-- Bulk terminate all active queries running for more than 5 minutes
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'active'
  AND age(clock_timestamp(), query_start) > interval '5 minutes';
```

### Option B: Temporarily Increase Connection Limits
If the workload is legitimate and the DB instance has headroom for memory and CPU:
1. Log in to the PostgreSQL container or VM.
2. Edit `/var/lib/postgresql/data/postgresql.conf` or equivalent config file:
   ```ini
   max_connections = 150 # Increase from 100
   ```
3. Restart/reload PostgreSQL:
   ```bash
   # Reload config without terminating sessions (if parameter allows)
   pg_ctl reload -D /var/lib/postgresql/data
   # OR restart container
   docker restart postgresql
   ```
   *Warning: Changing `max_connections` usually requires a full database restart.*

### Option C: Restart the Upstream API Service
If the Node.js API pool leaked connections and failed to release them back:
```bash
docker restart api_service
```

---

## 📝 Prevention & Long-Term Fixes
1. Ensure connection pooling is configured on the `api_service` using tools like `pgbouncer`.
2. Configure timeouts (e.g. `statement_timeout = 5000` to prevent queries from running indefinitely).
3. Implement exponential backoff and retry mechanisms on the API.

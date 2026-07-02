# SRE Runbook: Redis Cache Outage

**Alerts Handled:** `RedisDown`, `RedisCacheHitRatioLow`, `RedisMemoryUsageHigh`
**Severity:** P2 / High
**Topology Component:** `redis` (job: `redis_exporter`)
**Downstream Impact:** `api_service` (job: `node_api`, service: `api`) experiencing high latency (cache misses forcing database query paths) and memory pressure (queueing connections / retries).

---

## 📋 Description
This runbook covers the triage and remediation steps for Redis Cache unavailability or high memory exhaustion. If Redis is down, the downstream API service loses its caching layer. All queries fall back to the database, causing request latency to escalate and risking database saturation.

---

## 🔎 Step-by-Step Triage & Diagnosis

### 1. Check Redis Process Status
Validate if Redis is running and responding on its standard port (6379):
```bash
# Ping the Redis server
redis-cli -h redis-host ping
# Expected response: PONG
```

### 2. Inspect Memory Utilization & Eviction Rate
If Redis is running but memory usage is extremely high (above 85%):
```bash
redis-cli -h redis-host info memory
```
Look for:
- `used_memory_human`: Total memory used.
- `maxmemory_human`: Max memory limit.
- `evicted_keys`: If this is climbing rapidly, keys are being evicted aggressively because memory is full.

### 3. Check Redis Client Connection Count
```bash
redis-cli -h redis-host info clients
```
If `connected_clients` is unusually high, the client pool may have leaked connections, or API instances are spawning excessive connections.

---

## 🛠️ Mitigation & Resolution

### Option A: Restart the Redis Instance (If Down/Frozen)
If the Redis service is down or completely unresponsive:
```bash
# If running via Docker Compose
docker restart redis

# If running via systemd
sudo systemctl restart redis-server
```

### Option B: Flush Cache / Clear Evicted Keys (Immediate Relief for Saturation)
If Redis is saturated and crashing due to memory limits, you can flush the cache (warning: this will spike database latency temporarily as cache repopulates):
```bash
# Clear all keys from the current database
redis-cli -h redis-host flushdb

# Clear all keys from all databases
redis-cli -h redis-host flushall
```

### Option C: Dynamically Adjust Max Memory or Eviction Policy
If memory is full and you need to adjust Redis behavior without restarting:
```bash
# Set max memory limit higher (e.g. to 1GB) if system has free RAM
redis-cli -h redis-host config set maxmemory 1073741824

# Set eviction policy to volatile-lru or allkeys-lru to automatically drop old keys
redis-cli -h redis-host config set maxmemory-policy allkeys-lru
```

---

## 📝 Prevention & Long-Term Fixes
1. Ensure all cached items have a sensible Time-To-Live (TTL) set.
2. Set a strict `maxmemory` limit in `redis.conf` along with an eviction policy (e.g., `allkeys-lru`).
3. Implement a fallback/circuit breaker in the API so that cache connection failures fail fast and do not block request loops.

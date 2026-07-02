# SRE Runbook: Traffic Spike / DDoS Overload

**Alerts Handled:** `TrafficSpike`, `HighCPUUsage`, `HighHttp5xxRate`
**Severity:** P2 / High (Escalates to P1 if 5xx errors breach 10%)
**Topology Component:** `nginx` (job: `nginx`), `api_service` (job: `node_api`, service: `api`)
**Downstream Impact:** Request latency spikes across all services; upstream clients receive 502/503/504 errors due to resource starvation.

---

## 📋 Description
This runbook addresses a sudden, massive increase in inbound traffic or a Distributed Denial of Service (DDoS) attack. Under high load, Nginx and API service CPU and memory saturate, connection pools exhaust, and services begin dropping requests with HTTP 5xx errors.

---

## 🔎 Step-by-Step Triage & Diagnosis

### 1. Identify the Request Volume and Pattern
Inspect the HTTP request logs or run connection analysis on Nginx:
```bash
# Check current active TCP connections on Nginx
netstat -an | grep :80 | wc -l
```

### 2. Identify the Top IP Addresses (Suspected Attackers)
Run a log parser on the active Nginx access log to find the top IP addresses sending requests:
```bash
tail -n 10000 /var/log/nginx/access.log | awk '{print $1}' | sort | uniq -c | sort -nr | head -20
```

### 3. Check System Resource Saturation
Run resource check commands on Nginx and the Node.js API instances:
```bash
# Check CPU/Memory per process
top -b -n 1 | head -n 25
```

---

## 🛠️ Mitigation & Resolution

### Option A: Enable Rate Limiting (Immediate Protection)
If Nginx has rate limiting configured but not active, enable it in the configuration (e.g. `/etc/nginx/nginx.conf`):
```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=30r/s;

server {
    location /api/ {
        limit_req zone=api_limit burst=50 nodelay;
        proxy_pass http://api_service;
    }
}
```
Reload Nginx config:
```bash
nginx -t && nginx -s reload
```

### Option B: Block Malicious IP Addresses
If a small number of IP addresses are responsible for the traffic flood, block them at the Nginx level or firewall:
```nginx
# In nginx.conf
deny 192.168.1.100;
deny 10.0.0.50;
```
Alternatively, block via iptables:
```bash
sudo iptables -A INPUT -s 192.168.1.100 -j DROP
```

### Option C: Horizontal Scaling (If traffic is legitimate)
If the spike is due to a legitimate marketing event or seasonal load:
- **Docker Compose:** Scale up the API container instances:
  ```bash
  docker compose up -d --scale api_service=5
  ```
- **Kubernetes:** Adjust replicas or HPA:
  ```bash
  kubectl scale deployment api_service-deployment --replicas=8
  ```

---

## 📝 Prevention & Long-Term Fixes
1. Implement a Content Delivery Network (CDN) like Cloudflare or CloudFront to cache static assets and absorb DDoS volume.
2. Implement robust API rate limiting, API key quotas, and Web Application Firewall (WAF) rules.
3. Configure Horizontal Pod Autoscaling (HPA) to dynamically resize resources based on CPU or request rate.

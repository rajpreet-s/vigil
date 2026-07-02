# SRE Runbook: Disk Space Exhaustion

**Alerts Handled:** `HighDiskUsage`, `CriticalDiskUsage`, `ServiceDown` (API crashed)
**Severity:** P2 / High (P1 when service goes down)
**Topology Component:** `api_service` (job: `node_api`, service: `api`)
**Downstream Impact:** When the disk reaches 100% capacity, the API service is unable to write logs or temporary session files, causing it to crash and report `service_up == 0`. Upstream `nginx` fails to reach the backend, returning HTTP 502/504 errors.

---

## 📋 Description
This runbook details how to triage and mitigate critical disk space saturation on the Node.js API server. Rapid log accumulation or unrotated temporary files can saturate the root mount, causing immediate system write failures and process crashes.

---

## 🔎 Step-by-Step Triage & Diagnosis

### 1. Confirm the Saturation Mount Point
Check disk utilization and partition state:
```bash
df -h
# Look for partitions showing 90%+ utilization (especially / or /var/log)
```

### 2. Locate Largest Directories and Log Files
Find where the space is being consumed:
```bash
# Top 10 largest directories
sudo du -sh /* 2>/dev/null | sort -rh | head -10

# Search under common log directories
sudo du -sh /var/log/* | sort -rh | head -10
```

### 3. Identify Processes Holding Open Deleted Files
Sometimes a log file is deleted via `rm` but the API process still has an open file handle, preventing space from being reclaimed:
```bash
sudo lsof +L1 | grep deleted
# Note the PID and the file path. Reclaim space by restarting that PID.
```

---

## 🛠️ Mitigation & Resolution

### Option A: Safely Truncate Log Files (Immediate Relief)
*Do not* delete active log files using `rm`. Instead, truncate them to release disk space immediately without breaking the application's open file handle:
```bash
# Truncate the main application log to 0 bytes
sudo truncate -s 0 /var/log/api_service/debug.log
# OR
sudo > /var/log/api_service/debug.log
```

### Option B: Clean Package Manager and Cache Directories
Free up operating system disk cache:
```bash
# Ubuntu/Debian clean-up
sudo apt-get clean
sudo rm -rf /root/.cache/*
sudo rm -rf /home/*/.cache/*
```

### Option C: Restart the Crashed API Service
If the API service has crashed because it couldn't write to disk, clear space first, then restart it:
```bash
# If running via Docker Compose
docker restart api_service

# If running via systemd
sudo systemctl restart api_service
```

---

## 📝 Prevention & Long-Term Fixes
1. Configure `logrotate` for the application log directories (compress, daily rotation, keep max 7 files).
2. Set alerts to trigger at 80% (Warning) and 90% (Critical) so SRE has time to intervene before the service crashes at 100%.
3. Enable auto-expanding cloud volumes (e.g. AWS EBS CSI driver dynamic volume resizing) for stateful applications.

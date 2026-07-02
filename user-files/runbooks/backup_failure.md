# SRE Runbook: Nightly Backup Job Failure

**Alerts Handled:** `BackupJobFailed`, `BackupJobCritical`
**Severity:** P3 / Warning (P1 if critical / >48 hours without successful backup)
**Topology Component:** `postgresql` (data storage backups)
**Impact:** No active database backups exist for disaster recovery. If a database corruption or node failure occurs during this window, data loss will occur since the last successful snapshot.

---

## 📋 Description
This runbook covers the troubleshooting and manual run of database backup scripts when the scheduled nightly backup fails to complete or update its success heartbeat timestamp.

---

## 🔎 Step-by-Step Triage & Diagnosis

### 1. Identify the Last Successful Backup
Check the backup storage location (e.g. S3 bucket, local storage server, or volume) to find the timestamp of the last successful backup file:
```bash
# Check local backup storage directory
ls -lh /var/backups/postgres/
```

### 2. Inspect Backup Cron/Systemd Job Logs
Look at the logs of the backup scheduler to find why it failed:
```bash
# If run via cron
grep -i backup /var/log/syslog | tail -n 50

# If run via systemd service
journalctl -u postgres-backup.service -n 100 --no-pager
```
Common failure causes:
- **Disk Saturation**: Backup location is out of disk space.
- **Permission Denied**: Backup script user lost access to PG password files or destination bucket.
- **Database Lockup**: Long-running query blocked the tables, causing pg_dump to hang.

---

## 🛠️ Mitigation & Resolution

### Option A: Clean Disk Space (If space limit reached)
If the backup destination is full, clean up older backup archives:
```bash
# Delete backups older than 14 days
find /var/backups/postgres/ -name "*.sql.gz" -mtime +14 -delete
```

### Option B: Trigger Manual Backup
Manually run the backup script to ensure a new restore point exists:
```bash
# Run the backup script directly
sudo /usr/local/bin/postgres-backup.sh
```
Or run `pg_dump` manually:
```bash
pg_dump -U postgres -h localhost -F c -b -v -f "/var/backups/postgres/manual_backup_$(date +%F).dump" my_database
```

### Option C: Update Success Heartbeat (Once Fixed)
If the backup completes successfully, the script should automatically update the Prometheus metrics checkpoint file or endpoint. Verify the metric returns to healthy:
```bash
# Check metric age status
curl -s http://localhost:8001/metrics | grep backup_last_success_age_seconds
```

---

## 📝 Prevention & Long-Term Fixes
1. Implement a lifecycle policy on the backup storage bucket (e.g. AWS S3 Lifecycle Rules to transition files to Glacier and delete them after 30 days).
2. Configure Slack/PagerDuty notification endpoints directly inside the backup script wrapper for immediate failure notifications.
3. Schedule quarterly backup restoration test drills to verify backup files are non-corrupted and restorable.

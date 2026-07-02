# SRE Runbook: SSL/TLS Certificate Expiration Warning

**Alerts Handled:** `SSLCertificateExpiringSoon`, `SSLCertificateCritical`
**Severity:** P3 / Warning (P1 if expired / <1 day remaining)
**Scope:** External endpoints (e.g., `api.vigil.internal`)
**Impact:** Browsers and API clients will reject HTTPS requests with security errors, causing a total blackout for clients trying to reach the service.

---

## 📋 Description
This runbook covers the manual renewal of SSL/TLS certificates when the automated ACME renewal (such as Let's Encrypt / Certbot) fails to execute, leaving the certificate close to expiry.

---

## 🔎 Step-by-Step Triage & Diagnosis

### 1. Check Current Certificate State
Run the following `openssl` command to fetch the expiry date of the live certificate:
```bash
echo | openssl s_client -connect api.vigil.internal:443 2>/dev/null | openssl x509 -noout -dates
```
Identify the `notAfter` date to confirm how many days are left.

### 2. Inspect Automated Renewal Logs
If Certbot or another ACME client is configured, check its logs to find out why renewal failed:
```bash
sudo tail -n 100 /var/log/letsencrypt/letsencrypt.log
```
Common reasons include:
- DNS lookup failures (DNS challenge failing).
- Port 80 is blocked (HTTP-01 challenge failing).
- Rate limits exceeded.

---

## 🛠️ Mitigation & Resolution

### Option A: Force Certbot Manual / Automatic Renewal
If using Certbot, trigger a dry-run and then a forced renewal:
```bash
# Dry run verification
sudo certbot renew --dry-run

# If dry run succeeds, force immediate renewal
sudo certbot renew --force-renewal
```

### Option B: Perform DNS-01 Challenge Renewal Manually
If HTTP validation fails, try renewing using DNS validation:
```bash
sudo certbot certonly --manual --preferred-challenges dns -d api.vigil.internal
```
Follow instructions to add the TXT record to your DNS provider.

### Option C: Reload Upstream Web Server / Load Balancer
Once the certificate is renewed on disk, Nginx must be reloaded to load the new certificate files:
```bash
# Verify config syntax first
nginx -t

# Reload configuration gracefully
nginx -s reload
```

---

## 📝 Prevention & Long-Term Fixes
1. Ensure the Certbot cron job or systemd timer is active and running:
   ```bash
   systemctl list-timers | grep certbot
   ```
2. Set up external DNS monitoring to alert on certificate age independently of internal Prometheus metrics.

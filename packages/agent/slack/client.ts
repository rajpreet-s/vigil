import { WebClient } from '@slack/web-api';
import crypto from 'node:crypto';

// ─── Slack Web API client ─────────────────────────────────────────────────────
// Singleton — shared across all nodes. Token is read once at startup.

let _slack: WebClient | null = null;
export const slack = new Proxy({} as WebClient, {
    get(target, prop, receiver) {
        if (!_slack) {
            _slack = new WebClient(process.env.SLACK_BOT_TOKEN);
        }
        return Reflect.get(_slack, prop, receiver);
    }
});

// ─── verifySlackSignature ─────────────────────────────────────────────────────
//
// Validates that an incoming HTTP request genuinely came from Slack.
//
// Algorithm (https://api.slack.com/authentication/verifying-requests-from-slack):
//   1. Replay guard: reject if the request timestamp is > 5 minutes old.
//      Prevents an attacker from replaying a captured valid request later.
//   2. HMAC: compute  HMAC-SHA256( "v0:<timestamp>:<rawBody>", SLACK_SIGNING_SECRET )
//      and compare against the X-Slack-Signature header using a constant-time
//      comparison to prevent timing-oracle attacks.
//
// Returns true if the request is authentic, false otherwise.
// Throws if SLACK_SIGNING_SECRET is not configured (misconfiguration, not a
// bad request — caller should crash loudly on startup rather than silently
// accept unsigned requests).

const SLACK_MAX_AGE_SECONDS = 300; // 5 minutes — Slack's recommended window

export function verifySlackSignature(
    rawBody: string,
    timestampHeader: string,
    signatureHeader: string
): boolean {
    const signingSecret = process.env.SLACK_SIGNING_SECRET;
    if (!signingSecret) {
        throw new Error(
            'SLACK_SIGNING_SECRET environment variable is not set. ' +
                'Cannot verify Slack request signatures.'
        );
    }

    // ── 1. Replay attack guard ────────────────────────────────────────────────
    const requestTs = parseInt(timestampHeader, 10);
    if (isNaN(requestTs)) return false;

    const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - requestTs);
    if (ageSeconds > SLACK_MAX_AGE_SECONDS) return false;

    // ── 2. HMAC-SHA256 ────────────────────────────────────────────────────────
    const sigBaseStr = `v0:${timestampHeader}:${rawBody}`;
    const hmac = crypto
        .createHmac('sha256', signingSecret)
        .update(sigBaseStr)
        .digest('hex');
    const computed = `v0=${hmac}`;

    // Constant-time comparison — both buffers must be the same byte length.
    // If lengths differ, timingSafeEqual throws; guard it explicitly so we
    // return false rather than crashing on a malformed signature.
    try {
        return crypto.timingSafeEqual(
            Buffer.from(computed, 'utf8'),
            Buffer.from(signatureHeader, 'utf8')
        );
    } catch {
        return false;
    }
}

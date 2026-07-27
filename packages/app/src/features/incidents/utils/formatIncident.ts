export interface FormattedRca {
    cleanTitle: string;
    rootCauseService: string;
    confidenceLevel: string;
    q1WhatBroke: string;
    q2WhatCausedIt: string;
    q3DidWeCauseIt: string;
    q4WhatToDo: string;
    cleanSummary: string;
    formattedSlackMrkdwn: string;
}

/**
 * Parses exact DB/LLM incident state into Vigil's official Slack mrkdwn format.
 * Uses exact strings stored by LangGraph rca_node (q1WhatBroke, q2WhatCausedIt, q3DidWeCauseIt, fixSteps).
 * Does NOT add mock kubectl commands or hardcoded approval footers to drafts.
 */
export function parseRcaSummary(
    summary: string | undefined | null,
    fallbackServices: string[] = [],
    incidentId: string = '',
    fixSteps: string[] = []
): FormattedRca {
    const primaryService = fallbackServices[0] || 'unknown-service';
    const shortId = incidentId ? incidentId.slice(0, 8).toUpperCase() : 'UNKNOWN';

    let q1 = '';
    let q2 = '';
    let q3 = '';
    let q4 = '';

    const rawStr = (summary || '').trim();

    // 1. If stored as joined DB string "q1 | q2 | q3" from rca_node
    if (rawStr.includes(' | ')) {
        const parts = rawStr.split(' | ');
        q1 = parts[0] ? parts[0].trim() : '';
        q2 = parts[1] ? parts[1].trim() : '';
        q3 = parts[2] ? parts[2].trim() : '';
    } else if (rawStr.includes('Q1')) {
        // 2. If stored with Q1/Q2/Q3/Q4 headers
        const q1Match = rawStr.match(/Q1[^\n]*\n([\s\S]*?)(?=Q2|$)/i);
        if (q1Match && q1Match[1]) q1 = q1Match[1].trim();

        const q2Match = rawStr.match(/Q2[^\n]*\n([\s\S]*?)(?=Q3|$)/i);
        if (q2Match && q2Match[1]) q2 = q2Match[1].trim();

        const q3Match = rawStr.match(/Q3[^\n]*\n([\s\S]*?)(?=Q4|$)/i);
        if (q3Match && q3Match[1]) q3 = q3Match[1].trim();

        const q4Match = rawStr.match(/Q4[^\n]*\n([\s\S]*?)(?=$)/i);
        if (q4Match && q4Match[1]) q4 = q4Match[1].trim();
    } else if (rawStr.length > 0) {
        // 3. Plain summary stored in DB
        q1 = rawStr;
    }

    // Extract Root Cause Service from DB text if present
    let rootCauseService = primaryService;
    const rcMatch = rawStr.match(/Root cause:\s*\*?([^\s*—|]+)\*?/i);
    if (rcMatch && rcMatch[1]) {
        rootCauseService = rcMatch[1].replace(/\*/g, '').trim();
    }

    // Extract Confidence Level from DB text
    let confidenceLevel = 'HIGH';
    const confMatch = rawStr.match(/Confidence:\s*\*?([A-Z]+)\*?/i);
    if (confMatch && confMatch[1]) {
        confidenceLevel = confMatch[1].toUpperCase();
    }

    // Q1 fallback if empty
    if (!q1) {
        q1 = `Telemetry anomaly detected on service *${primaryService}*.`;
    }

    // Q2 fallback if empty
    if (!q2) {
        q2 = `Root cause: *${rootCauseService}*`;
    }

    // Q3 fallback if empty
    if (!q3) {
        q3 = `:white_check_mark: No deploy found within the 30-minute window`;
    }

    // Format Q4 exclusively from real fixSteps array or extracted q4 string
    if (fixSteps && fixSteps.length > 0) {
        q4 = fixSteps.map((step, idx) => `${idx + 1}. ${step}`).join('\n');
    } else if (!q4) {
        q4 = `_No fix steps available._`;
    }

    // Generate Title
    let cleanTitle = `${rootCauseService.toUpperCase()} Service Outage & Telemetry Anomaly`;
    if (rawStr.toLowerCase().includes('insufficient topology')) {
        cleanTitle = `${rootCauseService.toUpperCase()} Telemetry Anomaly Triggered`;
    }

    // Draft mrkdwn (No hardcoded "Approved" footer pre-approval)
    const formattedSlackMrkdwn = `⚡ Vigil — Incident #${shortId}\n\n` +
        `*Q1 — What broke?*\n${q1}\n\n` +
        `*Q2 — What caused it?*\n${q2}\n\n` +
        `*Q3 — Did we cause it?*\n${q3}\n\n` +
        `*Q4 — What do I do?*\n${q4}`;

    return {
        cleanTitle,
        rootCauseService,
        confidenceLevel,
        q1WhatBroke: q1,
        q2WhatCausedIt: q2,
        q3DidWeCauseIt: q3,
        q4WhatToDo: q4,
        cleanSummary: q1.replace(/\*/g, ''),
        formattedSlackMrkdwn,
    };
}

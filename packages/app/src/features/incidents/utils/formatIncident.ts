export interface RunbookStep {
    stepNum: number;
    description: string;
    command?: string;
}

export interface FormattedRca {
    cleanTitle: string;
    rootCauseService: string;
    confidenceLevel: string;
    q1WhatBroke: string;
    q2WhatCausedIt: string;
    q3DidWeCauseIt: string;
    q4WhatToDo: string;
    runbookSteps: RunbookStep[];
    cleanSummary: string;
    formattedSlackMrkdwn: string;
}

/**
 * Strips raw markdown asterisks (*, **) and clean extra whitespace.
 */
export function sanitizeMarkdownText(text: string): string {
    if (!text) return '';
    return text
        // Strip bold/italic asterisks while preserving actual word content
        .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
        .replace(/\*/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Parses fix_steps array or Q4 raw text into structured runbook steps with commands.
 */
export function parseRunbookSteps(stepsInput: string[] | string | undefined): RunbookStep[] {
    const rawList: string[] = [];

    if (Array.isArray(stepsInput)) {
        rawList.push(...stepsInput);
    } else if (typeof stepsInput === 'string' && stepsInput.trim()) {
        const lines = stepsInput.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        rawList.push(...lines);
    }

    if (rawList.length === 0) {
        return [];
    }

    return rawList.map((raw, idx) => {
        // Strip leading number like "1. ", "1) ", "[1] "
        const cleaned = raw.replace(/^\s*(?:\[?\d+\]?[.):-]?\s*)/, '').trim();

        // Check if there is an explicit command separated by a colon or backticks
        // E.g. "Scale PgBouncer: kubectl scale deployment/pgbouncer --replicas=4"
        // E.g. "Inspect logs: `journalctl -u postgresql -n 100`"
        let description = cleaned;
        let command: string | undefined = undefined;

        // Check for backticks first
        const backtickMatch = cleaned.match(/`([^`]+)`/);
        if (backtickMatch && backtickMatch[1]) {
            command = backtickMatch[1].trim();
            description = cleaned.replace(/`[^`]+`/, '').replace(/:\s*$/, '').trim();
        } else if (cleaned.includes(': ')) {
            const colonIdx = cleaned.indexOf(': ');
            const potentialDesc = cleaned.slice(0, colonIdx).trim();
            const potentialCmd = cleaned.slice(colonIdx + 2).trim();

            const isCmd = /^(?:kubectl|sudo|curl|psql|journalctl|systemctl|docker|helm|git|SELECT|ALTER|UPDATE|export|cat|grep|ls|kill|pkill)\b/i.test(potentialCmd) ||
                potentialCmd.includes(' --') || potentialCmd.startsWith('-');

            if (isCmd) {
                description = potentialDesc;
                command = potentialCmd;
            }
        } else if (/^(?:kubectl|sudo|curl|psql|journalctl|systemctl|docker|helm|git|SELECT|export)\b/i.test(cleaned)) {
            command = cleaned;
            description = `Execute ${cleaned.split(' ')[0]} command`;
        }

        // Clean up markdown in description
        description = sanitizeMarkdownText(description);

        return {
            stepNum: idx + 1,
            description: description || `Step ${idx + 1}`,
            command: command ? command.replace(/`/g, '').trim() : undefined,
        };
    });
}

/**
 * Parses exact DB/LLM incident state into Vigil's official Slack mrkdwn format and structured UI objects.
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
        q1 = `Telemetry anomaly detected on service ${primaryService}.`;
    }

    // Q2 fallback if empty
    if (!q2) {
        q2 = `Root cause: ${rootCauseService}`;
    }

    // Q3 fallback if empty
    if (!q3) {
        q3 = `[NO DEPLOY] No deploy found within the 30-minute window`;
    }

    // Sanitize Q1, Q2, Q3 from raw markdown asterisks
    const cleanQ1 = sanitizeMarkdownText(q1);
    const cleanQ2 = sanitizeMarkdownText(q2);
    const cleanQ3 = sanitizeMarkdownText(q3);

    // Format Q4 exclusively from real fixSteps array or extracted q4 string
    const runbookSteps = parseRunbookSteps(fixSteps && fixSteps.length > 0 ? fixSteps : q4);

    if (fixSteps && fixSteps.length > 0) {
        q4 = fixSteps.map((step, idx) => `${idx + 1}. ${sanitizeMarkdownText(step)}`).join('\n');
    } else if (!q4) {
        q4 = `_No fix steps available._`;
    } else {
        q4 = sanitizeMarkdownText(q4);
    }

    // Generate Title
    let cleanTitle = `${rootCauseService.toUpperCase()} Service Outage & Telemetry Anomaly`;
    if (rawStr.toLowerCase().includes('insufficient topology')) {
        cleanTitle = `${rootCauseService.toUpperCase()} Telemetry Anomaly Triggered`;
    }

    // Draft mrkdwn (No hardcoded "Approved" footer pre-approval)
    const formattedSlackMrkdwn = `[VIGIL] Incident #${shortId}\n\n` +
        `*Q1 — What broke?*\n${cleanQ1}\n\n` +
        `*Q2 — What caused it?*\n${cleanQ2}\n\n` +
        `*Q3 — Did we cause it?*\n${cleanQ3}\n\n` +
        `*Q4 — What do I do?*\n${q4}`;

    return {
        cleanTitle,
        rootCauseService,
        confidenceLevel,
        q1WhatBroke: cleanQ1,
        q2WhatCausedIt: cleanQ2,
        q3DidWeCauseIt: cleanQ3,
        q4WhatToDo: q4,
        runbookSteps,
        cleanSummary: cleanQ1,
        formattedSlackMrkdwn,
    };
}

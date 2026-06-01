export interface AlertPayload {
    status: "firing" | "resolved";
    labels: {
        alertname: string;
        service: string;
        severity?: string;
        [key: string]: string | undefined;
    };
    startsAt: string;
    endsAt?: string;
    generatorURL?: string;
}

export interface AlertmanagerPayload {
    receiver?: string;
    status?: string;
    alerts: AlertPayload[];
}

export interface GitHubCommit {
    id: string;
    message: string;
    timestamp: string;
    author: {
        name: string;
        email?: string;
        username?: string;
    };
    added: string[];
    removed: string[];
    modified: string[];
}

export interface GitHubPushPayload {
    commits: GitHubCommit[];
    head_commit: {
        id: string;
        author: {
            name: string;
            email?: string;
            username?: string;
        };
        message: string;
        timestamp: string;
    } | null;
    ref: string;
}
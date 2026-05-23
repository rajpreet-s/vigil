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

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ApiIncident, PaginatedIncidentsResponse } from '../../../types/incident';

interface UseIncidentsOptions {
    severity?: string;
    status?: string;
    orgId?: string | null;
}

export function useIncidents(options: UseIncidentsOptions = {}) {
    const [incidents, setIncidents] = useState<ApiIncident[]>([]);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState<boolean>(true);
    const [total, setTotal] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isFetchingMore, setIsFetchingMore] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const optionsRef = useRef(options);
    optionsRef.current = options;

    const fetchIncidents = useCallback(
        async (cursorToFetch: string | null = null, isInitial: boolean = false) => {
            if (isInitial) {
                setIsLoading(true);
                setError(null);
            } else {
                setIsFetchingMore(true);
            }

            try {
                const params = new URLSearchParams();
                if (cursorToFetch) params.append('cursor', cursorToFetch);
                params.append('limit', '15');
                if (optionsRef.current.severity && optionsRef.current.severity !== 'all') {
                    params.append('severity', optionsRef.current.severity);
                }
                if (optionsRef.current.status) {
                    params.append('status', optionsRef.current.status);
                }

                const res = await fetch(`/api/incidents?${params.toString()}`);
                if (!res.ok) {
                    throw new Error(`Failed to fetch incidents: ${res.statusText}`);
                }

                const data: PaginatedIncidentsResponse = await res.json();

                setIncidents((prev) => (isInitial ? data.data : [...prev, ...data.data]));
                setNextCursor(data.nextCursor);
                setHasMore(data.hasMore);
                setTotal(data.total);
            } catch (err: any) {
                console.error('Error loading incidents:', err);
                setError(err.message || 'Failed to load incidents');
            } finally {
                setIsLoading(false);
                setIsFetchingMore(false);
            }
        },
        []
    );

    // Initial fetch and fetch when filters or orgId change
    useEffect(() => {
        setIncidents([]);
        setNextCursor(null);
        setHasMore(true);
        fetchIncidents(null, true);
    }, [options.severity, options.status, options.orgId, fetchIncidents]);

    // Fetch next page
    const fetchNextPage = useCallback(() => {
        if (!hasMore || isFetchingMore || isLoading || !nextCursor) return;
        fetchIncidents(nextCursor, false);
    }, [hasMore, isFetchingMore, isLoading, nextCursor, fetchIncidents]);

    // IntersectionObserver setup for infinite scroll
    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const first = entries[0];
                if (first.isIntersecting && hasMore && !isFetchingMore && !isLoading && nextCursor) {
                    fetchNextPage();
                }
            },
            { threshold: 0.1 }
        );

        observer.observe(sentinel);

        return () => {
            observer.unobserve(sentinel);
        };
    }, [hasMore, isFetchingMore, isLoading, nextCursor, fetchNextPage]);

    return {
        incidents,
        hasMore,
        total,
        isLoading,
        isFetchingMore,
        error,
        sentinelRef,
        fetchNextPage,
        refetch: () => fetchIncidents(null, true),
    };
}

import { useState, useEffect, useRef } from 'react';
import { getQueueStatus } from '../api/client';
import type { QueueStatus } from '../types';

const REFRESH_INTERVAL_MS = 10_000;

export function useQueueStatus(enabled: boolean): QueueStatus | null {
    const [status, setStatus] = useState<QueueStatus | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!enabled) return;

        async function fetch() {
            try {
                const data = await getQueueStatus();
                setStatus(data);
            } catch {
                // silently ignore — banner is optional
            }
        }

        fetch();
        intervalRef.current = setInterval(fetch, REFRESH_INTERVAL_MS);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [enabled]);

    return status;
}

import { useState, useRef, useCallback } from 'react';
import { startCollectionScan, getCollectionSession } from '../api/client';
import { NetworkError, ApiError } from '../api/client';
import type { CollectionWalletResult } from '../types';

const POLL_INTERVAL_MS = 5000;

export type RescanPhase = 'idle' | 'scanning' | 'done' | 'error';

export interface RescanState {
    phase: RescanPhase;
    sessionId: string | null;
    completed: number;
    total: number;
    percent: number;
    newResults: CollectionWalletResult[];
    error: string | null;
}

const INITIAL: RescanState = {
    phase: 'idle',
    sessionId: null,
    completed: 0,
    total: 0,
    percent: 0,
    newResults: [],
    error: null,
};

export function useRescan() {
    const [state, setState] = useState<RescanState>(INITIAL);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    function stopPolling() {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    }

    const poll = useCallback(async (sessionId: string) => {
        try {
            const data = await getCollectionSession(sessionId);

            // Accumulate results as they arrive
            setState(prev => {
                const map = new Map<string, CollectionWalletResult>();
                for (const r of prev.newResults) if (r?.wallet) map.set(r.wallet.toLowerCase(), r);
                for (const r of data.results) if (r?.wallet) map.set(r.wallet.toLowerCase(), r);
                return {
                    ...prev,
                    completed: data.progress.completed,
                    total: data.progress.total,
                    percent: data.progress.percent,
                    newResults: Array.from(map.values()),
                    phase: data.status === 'done' ? 'done'
                        : data.status === 'stalled' ? 'done'  // treat stalled as done — use what we have
                            : 'scanning',
                };
            });

            if (data.status === 'done' || data.status === 'stalled') {
                stopPolling();
            }
        } catch (err) {
            if (err instanceof NetworkError) return; // transient, keep polling
            if (err instanceof ApiError && (err.status === 404 || err.status === 410)) {
                stopPolling();
                setState(prev => ({ ...prev, phase: 'done' })); // session expired — use what we have
                return;
            }
            stopPolling();
            setState(prev => ({
                ...prev,
                phase: 'error',
                error: err instanceof Error ? err.message : 'Rescan failed',
            }));
        }
    }, []);

    async function startRescan(addresses: string[], collectionName: string) {
        stopPolling();
        setState({ ...INITIAL, phase: 'scanning', total: addresses.length });
        try {
            const res = await startCollectionScan(
                { addresses },
                `Rescan — ${collectionName}`
            );
            setState(prev => ({ ...prev, sessionId: res.sessionId, total: res.total }));
            await poll(res.sessionId);
            intervalRef.current = setInterval(() => poll(res.sessionId), POLL_INTERVAL_MS);
        } catch (err) {
            setState(prev => ({
                ...prev,
                phase: 'error',
                error: err instanceof Error ? err.message : 'Failed to start rescan',
            }));
        }
    }

    function reset() {
        stopPolling();
        setState(INITIAL);
    }

    return { state, startRescan, reset };
}

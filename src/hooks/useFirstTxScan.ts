import { useState, useRef, useCallback } from 'react';
import { startFirstTxScan, getFirstTxSession } from '../api/client';
import { NetworkError } from '../api/client';
import type { FirstTxResult } from '../types';

const POLL_INTERVAL_MS = 3000;

export type FirstTxPhase = 'idle' | 'scanning' | 'done' | 'error';

export interface FirstTxState {
    phase: FirstTxPhase;
    completed: number;
    total: number;
    percent: number;
    results: FirstTxResult[];
    error: string | null;
}

const INITIAL: FirstTxState = {
    phase: 'idle',
    completed: 0,
    total: 0,
    percent: 0,
    results: [],
    error: null,
};

export function useFirstTxScan() {
    const [state, setState] = useState<FirstTxState>(INITIAL);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    function stopPolling() {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    }

    const poll = useCallback(async (sessionId: string) => {
        try {
            const data = await getFirstTxSession(sessionId);

            setState(prev => {
                // Merge results — accumulate as they arrive
                const map = new Map<string, FirstTxResult>();
                for (const r of prev.results) map.set(r.address.toLowerCase(), r);
                for (const r of data.results) map.set(r.address.toLowerCase(), r);
                return {
                    ...prev,
                    completed: data.progress.completed,
                    total: data.progress.total,
                    percent: data.progress.percent,
                    results: Array.from(map.values()),
                    phase: data.status === 'done' ? 'done' : 'scanning',
                };
            });

            if (data.status === 'done') stopPolling();
        } catch (err) {
            if (err instanceof NetworkError) return; // transient, keep polling
            stopPolling();
            setState(prev => ({
                ...prev,
                phase: 'error',
                error: err instanceof Error ? err.message : 'First TX scan failed',
            }));
        }
    }, []);

    async function startScan(addresses: string[]) {
        stopPolling();
        setState({ ...INITIAL, phase: 'scanning', total: addresses.length });
        try {
            const res = await startFirstTxScan(addresses);
            setState(prev => ({ ...prev, total: res.total }));
            await poll(res.sessionId);
            intervalRef.current = setInterval(() => poll(res.sessionId), POLL_INTERVAL_MS);
        } catch (err) {
            setState(prev => ({
                ...prev,
                phase: 'error',
                error: err instanceof Error ? err.message : 'Failed to start first TX scan',
            }));
        }
    }

    function reset() {
        stopPolling();
        setState(INITIAL);
    }

    return { state, startScan, reset };
}

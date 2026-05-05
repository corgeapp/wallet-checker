import { useState, useRef, useCallback } from 'react';
import { startTransferCheck, getTransferSession } from '../api/client';
import { NetworkError } from '../api/client';
import type { TransferResult } from '../types';

const POLL_INTERVAL_MS = 5000;

export type TransferPhase = 'idle' | 'loading' | 'scanning' | 'done' | 'error';

export interface TransferCheckState {
    phase: TransferPhase;
    completed: number;
    total: number;
    percent: number;
    transferred: number;
    not_transferred: number;
    sales: number;
    plain_transfers: number;
    results: TransferResult[];
    error: string | null;
}

const INITIAL: TransferCheckState = {
    phase: 'idle',
    completed: 0,
    total: 0,
    percent: 0,
    transferred: 0,
    not_transferred: 0,
    sales: 0,
    plain_transfers: 0,
    results: [],
    error: null,
};

export function useTransferCheck() {
    const [state, setState] = useState<TransferCheckState>(INITIAL);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    function stopPolling() {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    }

    const poll = useCallback(async (sessionId: string) => {
        try {
            const data = await getTransferSession(sessionId);

            setState(prev => {
                // Accumulate results as they arrive
                const map = new Map<string, TransferResult>();
                for (const r of prev.results) if (r?.address) map.set(r.address.toLowerCase(), r);
                for (const r of data.results) if (r?.address) map.set(r.address.toLowerCase(), r);
                return {
                    ...prev,
                    completed: data.progress.completed,
                    total: data.progress.total,
                    percent: data.progress.percent,
                    transferred: data.transferred,
                    not_transferred: data.not_transferred,
                    sales: data.sales ?? 0,
                    plain_transfers: data.plain_transfers ?? 0,
                    results: Array.from(map.values()),
                    phase: data.status === 'done' ? 'done'
                        : data.status === 'error' ? 'error'
                            : 'scanning',
                    error: data.status === 'error' ? 'Transfer check failed on the server.' : null,
                };
            });

            if (data.status === 'done' || data.status === 'error') stopPolling();
        } catch (err) {
            if (err instanceof NetworkError) return; // transient, keep polling
            stopPolling();
            setState(prev => ({
                ...prev,
                phase: 'error',
                error: err instanceof Error ? err.message : 'Transfer check failed',
            }));
        }
    }, []);

    async function startCheck(contract: string, addresses: string[]) {
        stopPolling();
        setState({ ...INITIAL, phase: 'loading', total: addresses.length });
        try {
            const res = await startTransferCheck(contract, addresses);
            setState(prev => ({ ...prev, phase: 'scanning', total: res.total }));
            // Wait one interval before first poll
            intervalRef.current = setInterval(() => poll(res.sessionId), POLL_INTERVAL_MS);
        } catch (err) {
            setState(prev => ({
                ...prev,
                phase: 'error',
                error: err instanceof Error ? err.message : 'Failed to start transfer check',
            }));
        }
    }

    function reset() {
        stopPolling();
        setState(INITIAL);
    }

    return { state, startCheck, reset };
}

import { useState, useEffect, useRef, useCallback } from 'react';
import { startCollectionScan, startCollectionScanCSV, getCollectionSession, cancelCollectionSession } from '../api/client';
import { NetworkError, ApiError } from '../api/client';
import type { CollectionScanState, CollectionWalletResult } from '../types';

const POLL_INTERVAL_MS = 5000;
const STORAGE_KEY_PREFIX = 'corge_scan_';

function storageKey(sessionId: string) {
    return `${STORAGE_KEY_PREFIX}${sessionId}`;
}

function saveToStorage(sessionId: string, results: CollectionWalletResult[]) {
    try {
        localStorage.setItem(storageKey(sessionId), JSON.stringify({
            sessionId,
            savedAt: Date.now(),
            results,
        }));
    } catch {
        // storage full — ignore
    }
}

function loadFromStorage(sessionId: string): CollectionWalletResult[] | null {
    try {
        const raw = localStorage.getItem(storageKey(sessionId));
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { results: CollectionWalletResult[] };
        return parsed.results ?? null;
    } catch {
        return null;
    }
}

const INITIAL_STATE: CollectionScanState = {
    phase: 'idle',
    sessionId: null,
    collectionName: '',
    progress: null,
    stats: null,
    results: [],
    stalled: null,
    error: null,
    totalSubmitted: 0,
    invalidCount: 0,
};

export function useCollectionScanner() {
    const [state, setState] = useState<CollectionScanState>(INITIAL_STATE);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const sessionIdRef = useRef<string | null>(null);

    function stopPolling() {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }

    const poll = useCallback(async (sessionId: string) => {
        try {
            const data = await getCollectionSession(sessionId);

            // Merge new results with saved ones (backend may return partial)
            const saved = loadFromStorage(sessionId) ?? [];
            const merged = mergeResults(saved, data.results);
            saveToStorage(sessionId, merged);

            if (data.status === 'cancelled') {
                stopPolling();
                setState(prev => ({
                    ...prev,
                    progress: data.progress,
                    stats: data.stats,
                    results: merged,
                    phase: 'cancelled',
                    error: data.cancelled?.reason ?? 'Session was cancelled',
                }));
                return;
            }

            setState(prev => ({
                ...prev,
                progress: data.progress,
                stats: data.stats,
                results: merged,
                stalled: data.stalled,
                phase: data.status === 'done' ? 'done'
                    : data.status === 'stalled' ? 'stalled'
                        : 'scanning',
            }));

            if (data.status === 'done' || data.status === 'stalled') {
                stopPolling();
            }
        } catch (err) {
            if (err instanceof NetworkError) {
                // transient — keep polling
            } else if (err instanceof ApiError && (err.status === 404 || err.status === 410)) {
                // Session expired or was cancelled server-side — preserve partial results
                stopPolling();
                const saved = loadFromStorage(sessionId) ?? [];
                setState(prev => ({
                    ...prev,
                    results: saved.length > prev.results.length ? saved : prev.results,
                    phase: 'interrupted',
                    error: 'Session expired on the server. Showing partial results collected so far.',
                }));
            } else {
                stopPolling();
                setState(prev => ({
                    ...prev,
                    phase: 'error',
                    error: err instanceof Error ? err.message : 'Polling failed',
                }));
            }
        }
    }, []);

    async function startScanFromFile(file: File, collectionName: string, partialResults?: CollectionWalletResult[]) {
        setState({ ...INITIAL_STATE, phase: 'uploading', collectionName });
        try {
            const res = await startCollectionScanCSV(file, collectionName || undefined);
            sessionIdRef.current = res.sessionId;
            // Seed localStorage with partial results so they survive interruption
            const saved = loadFromStorage(res.sessionId);
            const seeded = mergeResults(partialResults ?? [], saved ?? []);
            if (seeded.length > 0) saveToStorage(res.sessionId, seeded);
            setState(prev => ({
                ...prev,
                phase: 'scanning',
                sessionId: res.sessionId,
                totalSubmitted: res.total,
                invalidCount: res.invalid,
                results: seeded,
            }));
            await poll(res.sessionId);
            intervalRef.current = setInterval(() => poll(res.sessionId), POLL_INTERVAL_MS);
        } catch (err) {
            setState(prev => ({
                ...prev,
                phase: 'error',
                error: err instanceof Error ? err.message : 'Failed to start scan',
            }));
        }
    }

    async function startScan(body: Record<string, unknown>, collectionName: string, partialResults?: CollectionWalletResult[]) {
        setState({ ...INITIAL_STATE, phase: 'uploading', collectionName });
        try {
            // For paste/JSON mode, subtract already-scored addresses before sending
            const alreadyScored = new Set((partialResults ?? []).map(r => r.wallet.toLowerCase()));
            let payload = body;
            if (alreadyScored.size > 0 && Array.isArray(body.addresses)) {
                const remaining = (body.addresses as string[]).filter(a => !alreadyScored.has(a.toLowerCase()));
                payload = { ...body, addresses: remaining };
            }

            const res = await startCollectionScan(payload, collectionName || undefined);
            sessionIdRef.current = res.sessionId;
            const saved = loadFromStorage(res.sessionId);
            const seeded = mergeResults(partialResults ?? [], saved ?? []);
            if (seeded.length > 0) saveToStorage(res.sessionId, seeded);
            setState(prev => ({
                ...prev,
                phase: 'scanning',
                sessionId: res.sessionId,
                totalSubmitted: res.total,
                invalidCount: res.invalid,
                results: seeded,
            }));
            await poll(res.sessionId);
            intervalRef.current = setInterval(() => poll(res.sessionId), POLL_INTERVAL_MS);
        } catch (err) {
            setState(prev => ({
                ...prev,
                phase: 'error',
                error: err instanceof Error ? err.message : 'Failed to start scan',
            }));
        }
    }

    function reset() {
        stopPolling();
        // Cancel the session on the server if one is active
        if (sessionIdRef.current) {
            void cancelCollectionSession(sessionIdRef.current);
            sessionIdRef.current = null;
        }
        setState(INITIAL_STATE);
    }

    // Restore from localStorage if sessionId is known
    function restoreSession(sessionId: string) {
        const saved = loadFromStorage(sessionId);
        if (saved) {
            setState(prev => ({ ...prev, results: saved, sessionId }));
        }
    }

    // Cleanup on unmount — cancel active session so the server doesn't waste resources
    useEffect(() => {
        return () => {
            stopPolling();
            if (sessionIdRef.current) {
                void cancelCollectionSession(sessionIdRef.current);
            }
        };
    }, []);

    return { state, startScan, startScanFromFile, reset, restoreSession };
}

// Merge results arrays, deduplicating by wallet address, preferring newer entries
function mergeResults(
    existing: CollectionWalletResult[],
    incoming: CollectionWalletResult[]
): CollectionWalletResult[] {
    const map = new Map<string, CollectionWalletResult>();
    for (const r of existing) map.set(r.wallet.toLowerCase(), r);
    for (const r of incoming) map.set(r.wallet.toLowerCase(), r);
    return Array.from(map.values());
}

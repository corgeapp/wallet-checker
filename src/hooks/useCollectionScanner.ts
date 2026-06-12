import { useState, useEffect, useRef, useCallback } from 'react';
import { startCollectionScan, startCollectionScanCSV, getCollectionSession, getCollectionProgress } from '../api/client';
import { NetworkError, ApiError } from '../api/client';
import type { CollectionScanState, CollectionWalletResult } from '../types';

const POLL_INTERVAL_MS = 5000;
const STORAGE_KEY_PREFIX = 'corge_scan_';
const ACTIVE_SESSION_KEY = 'corge_active_scan';
const FULL_REFRESH_EVERY_POLLS = 3;

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
        // ignore storage failures
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

function saveActiveSession(sessionId: string, collectionName: string) {
    try {
        localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify({
            sessionId,
            collectionName,
            savedAt: Date.now(),
        }));
    } catch {
        // ignore storage failures
    }
}

function clearActiveSession(sessionId?: string | null) {
    try {
        if (!sessionId) {
            localStorage.removeItem(ACTIVE_SESSION_KEY);
            return;
        }
        const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as { sessionId?: string };
        if (parsed.sessionId === sessionId) localStorage.removeItem(ACTIVE_SESSION_KEY);
    } catch {
        localStorage.removeItem(ACTIVE_SESSION_KEY);
    }
}

const INITIAL_STATE: CollectionScanState = {
    phase: 'idle',
    sessionId: null,
    collectionName: '',
    progress: null,
    stats: null,
    results: [],
    failedAddresses: [],
    stalled: null,
    error: null,
    totalSubmitted: 0,
    invalidCount: 0,
};

export function useCollectionScanner() {
    const [state, setState] = useState<CollectionScanState>(INITIAL_STATE);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const sessionIdRef = useRef<string | null>(null);
    const pollCountRef = useRef(0);

    function stopPolling() {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }

    function applyFullSession(sessionId: string, phaseHint?: CollectionScanState['phase']) {
        return async () => {
            const fullData = await getCollectionSession(sessionId);
            const saved = loadFromStorage(sessionId) ?? [];
            const merged = mergeResults(saved, fullData.results);
            if (merged.length > 0) saveToStorage(sessionId, merged);

            const phase = phaseHint ?? (
                fullData.status === 'done'
                    ? 'done'
                    : fullData.status === 'stalled'
                        ? 'stalled'
                        : fullData.status === 'cancelled'
                            ? 'cancelled'
                            : 'scanning'
            );

            setState(prev => ({
                ...prev,
                collectionName: fullData.collectionName ?? prev.collectionName,
                progress: fullData.progress,
                stats: fullData.stats,
                results: merged,
                failedAddresses: fullData.failed ?? [],
                stalled: fullData.stalled,
                phase,
                error: fullData.cancelled?.reason ?? fullData.stalled?.message ?? null,
                totalSubmitted: fullData.progress.total,
            }));

            if (fullData.status === 'done' || fullData.status === 'cancelled') {
                clearActiveSession(sessionId);
            }

            return fullData;
        };
    }

    const poll = useCallback(async (sessionId: string) => {
        try {
            const data = await getCollectionProgress(sessionId);
            pollCountRef.current += 1;

            if (data.status === 'done' || data.status === 'cancelled' || data.status === 'stalled') {
                stopPolling();
                await applyFullSession(sessionId)();
                return;
            }

            const shouldRefreshResults =
                data.progress.completed > 0 &&
                pollCountRef.current % FULL_REFRESH_EVERY_POLLS === 0;

            if (shouldRefreshResults) {
                await applyFullSession(sessionId, 'scanning')();
                return;
            }

            setState(prev => ({
                ...prev,
                collectionName: data.collectionName ?? prev.collectionName,
                progress: data.progress,
                stalled: data.stalled,
                phase: 'scanning',
            }));
        } catch (err) {
            if (err instanceof NetworkError) {
                return;
            }

            if (err instanceof ApiError && (err.status === 404 || err.status === 410)) {
                stopPolling();
                const saved = loadFromStorage(sessionId) ?? [];
                setState(prev => ({
                    ...prev,
                    results: saved.length > prev.results.length ? saved : prev.results,
                    phase: 'interrupted',
                    error: 'Session expired on the server. Showing partial results collected so far.',
                }));
                clearActiveSession(sessionId);
                return;
            }

            stopPolling();
            setState(prev => ({
                ...prev,
                phase: 'error',
                error: err instanceof Error ? err.message : 'Polling failed',
            }));
        }
    }, []);

    async function startScanFromFile(file: File, collectionName: string, partialResults?: CollectionWalletResult[]) {
        setState({ ...INITIAL_STATE, phase: 'uploading', collectionName });
        try {
            const res = await startCollectionScanCSV(file, collectionName || undefined);
            sessionIdRef.current = res.sessionId;
            pollCountRef.current = 0;
            saveActiveSession(res.sessionId, collectionName || 'Collection scan');

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
            const alreadyScored = new Set((partialResults ?? []).map(r => r.wallet.toLowerCase()));
            let payload = body;
            if (alreadyScored.size > 0 && Array.isArray(body.addresses)) {
                const remaining = (body.addresses as string[]).filter(a => !alreadyScored.has(a.toLowerCase()));
                payload = { ...body, addresses: remaining };
            }

            const res = await startCollectionScan(payload, collectionName || undefined);
            sessionIdRef.current = res.sessionId;
            pollCountRef.current = 0;
            saveActiveSession(res.sessionId, collectionName || 'Collection scan');

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
        clearActiveSession(sessionIdRef.current);
        sessionIdRef.current = null;
        setState(INITIAL_STATE);
    }

    async function restoreSession(sessionId: string) {
        const trimmed = sessionId.trim();
        if (!trimmed) return;

        stopPolling();
        setState({ ...INITIAL_STATE, phase: 'uploading', sessionId: trimmed });

        try {
            sessionIdRef.current = trimmed;
            pollCountRef.current = 0;
            const fullData = await applyFullSession(trimmed)();
            saveActiveSession(trimmed, fullData.collectionName ?? 'Restored scan');

            if (fullData.status === 'running') {
                await poll(trimmed);
                intervalRef.current = setInterval(() => poll(trimmed), POLL_INTERVAL_MS);
            }
        } catch (err) {
            const saved = loadFromStorage(trimmed);
            setState(prev => ({
                ...prev,
                sessionId: trimmed,
                results: saved ?? [],
                phase: saved?.length ? 'interrupted' : 'error',
                error: err instanceof Error ? err.message : 'Could not restore scan session',
            }));
        }
    }

    useEffect(() => {
        try {
            const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw) as { sessionId?: string };
            if (parsed.sessionId) void restoreSession(parsed.sessionId);
        } catch {
            clearActiveSession();
        }
        // Run only once on mount to reconnect after refresh/crash.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        return () => {
            stopPolling();
        };
    }, []);

    return { state, startScan, startScanFromFile, reset, restoreSession };
}

function mergeResults(
    existing: CollectionWalletResult[],
    incoming: CollectionWalletResult[]
): CollectionWalletResult[] {
    const map = new Map<string, CollectionWalletResult>();
    for (const r of existing) map.set(r.wallet.toLowerCase(), r);
    for (const r of incoming) {
        const key = r.wallet.toLowerCase();
        const current = map.get(key);
        map.set(key, current ? mergeDefined(current, r) : r);
    }
    return Array.from(map.values());
}

function mergeDefined(existing: CollectionWalletResult, incoming: CollectionWalletResult): CollectionWalletResult {
    const merged = { ...existing };
    for (const [key, value] of Object.entries(incoming)) {
        if (value !== undefined && value !== null && value !== '') {
            (merged as Record<string, unknown>)[key] = value;
        }
    }
    return merged;
}

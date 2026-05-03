import { useState, useCallback } from 'react';
import type { CollectionWalletResult, CollectionStats } from '../types';

const STORAGE_KEY_PREFIX = 'corge_scan_';
const META_KEY = 'corge_scan_meta';

export interface ScanMeta {
    sessionId: string;
    collectionName: string;
    savedAt: number;
    totalResults: number;
    avgScore: number;
    status: 'done' | 'partial';
}

export interface SavedScan {
    sessionId: string;
    savedAt: number;
    results: CollectionWalletResult[];
}

/** Persist scan metadata index so we can list scans without loading all results */
export function saveScanMeta(
    sessionId: string,
    collectionName: string,
    results: CollectionWalletResult[],
    status: 'done' | 'partial' = 'done'
) {
    try {
        const existing = loadAllMeta();
        const avg = results.length > 0
            ? results.reduce((s, r) => s + r.wallet_score, 0) / results.length
            : 0;
        const meta: ScanMeta = {
            sessionId,
            collectionName: collectionName || 'Unnamed scan',
            savedAt: Date.now(),
            totalResults: results.length,
            avgScore: Math.round(avg * 100) / 100,
            status,
        };
        const updated = [meta, ...existing.filter(m => m.sessionId !== sessionId)].slice(0, 50);
        localStorage.setItem(META_KEY, JSON.stringify(updated));
    } catch { /* storage full */ }
}

export function loadAllMeta(): ScanMeta[] {
    try {
        const raw = localStorage.getItem(META_KEY);
        if (!raw) return [];
        return JSON.parse(raw) as ScanMeta[];
    } catch {
        return [];
    }
}

export function loadScanResults(sessionId: string): CollectionWalletResult[] | null {
    try {
        const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${sessionId}`);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { results: CollectionWalletResult[] };
        return parsed.results ?? null;
    } catch {
        return null;
    }
}

export function deleteScan(sessionId: string) {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${sessionId}`);
    const metas = loadAllMeta().filter(m => m.sessionId !== sessionId);
    localStorage.setItem(META_KEY, JSON.stringify(metas));
}

/** Compute stats from raw results (mirrors backend shape) */
export function computeStats(results: CollectionWalletResult[]): CollectionStats {
    if (results.length === 0) {
        return {
            total: 0, avg_score: 0, median_score: 0, min_score: 0, max_score: 0,
            sweepers: 0, new_wallets: 0, zero_flip_wallets: 0,
            label_distribution: {}, score_distribution: {},
        };
    }
    const scores = results.map(r => r.wallet_score).sort((a, b) => a - b);
    const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
    const mid = Math.floor(scores.length / 2);
    const median = scores.length % 2 === 0
        ? (scores[mid - 1] + scores[mid]) / 2
        : scores[mid];

    const labelDist: Record<string, number> = {};
    const scoreDist: Record<string, number> = { '0-2': 0, '2-4': 0, '4-6': 0, '6-8': 0, '8-10': 0 };
    let sweepers = 0, newWallets = 0, zeroFlip = 0;

    for (const r of results) {
        labelDist[r.label] = (labelDist[r.label] ?? 0) + 1;
        if (r.is_sweeper) sweepers++;
        if (r.label === 'New Wallet') newWallets++;
        if (r.flip_count === 0) zeroFlip++;
        const s = r.wallet_score;
        if (s < 2) scoreDist['0-2']++;
        else if (s < 4) scoreDist['2-4']++;
        else if (s < 6) scoreDist['4-6']++;
        else if (s < 8) scoreDist['6-8']++;
        else scoreDist['8-10']++;
    }

    return {
        total: results.length,
        avg_score: Math.round(avg * 100) / 100,
        median_score: Math.round(median * 100) / 100,
        min_score: scores[0],
        max_score: scores[scores.length - 1],
        sweepers,
        new_wallets: newWallets,
        zero_flip_wallets: zeroFlip,
        label_distribution: labelDist,
        score_distribution: scoreDist,
    };
}

export function useScanHistory() {
    const [metas, setMetas] = useState<ScanMeta[]>(() => loadAllMeta());

    const refresh = useCallback(() => {
        setMetas(loadAllMeta());
    }, []);

    const remove = useCallback((sessionId: string) => {
        deleteScan(sessionId);
        setMetas(prev => prev.filter(m => m.sessionId !== sessionId));
    }, []);

    return { metas, refresh, remove };
}

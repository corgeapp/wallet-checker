import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { CollectionWalletResult } from '../../types';

/**
 * Test suite for merging old results (without holder metrics) with new results (with holder metrics)
 * 
 * This validates Requirement 2.2 and 2.3:
 * - When merging existing and new results, preserve all fields from both sets
 * - When a wallet appears in both, use the new result data to update the stored entry
 */

// Extract the mergeResults function logic for testing
function mergeResults(
    existing: CollectionWalletResult[],
    incoming: CollectionWalletResult[]
): CollectionWalletResult[] {
    const map = new Map<string, CollectionWalletResult>();
    for (const r of existing) map.set(r.wallet.toLowerCase(), r);
    for (const r of incoming) map.set(r.wallet.toLowerCase(), r);
    return Array.from(map.values());
}

// Simulate localStorage operations
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

describe('useCollectionScanner - Merging Old and New Results', () => {
    const TEST_SESSION_ID = 'test_merge_session_456';

    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        localStorage.clear();
    });

    it('should merge new results with holder metrics into existing results without holder metrics', () => {
        // Simulate existing localStorage results (old format without holder metrics)
        const existingResults: CollectionWalletResult[] = [
            {
                wallet: '0xOldWallet1',
                wallet_score: 85,
                label: 'Diamond',
                is_sweeper: false,
                flip_count: 2,
                confidence: 0.95
            },
            {
                wallet: '0xOldWallet2',
                wallet_score: 72,
                label: 'Holder',
                is_sweeper: false,
                flip_count: 1,
                confidence: 0.88
            }
        ];

        // Save existing results to localStorage
        saveToStorage(TEST_SESSION_ID, existingResults);

        // Verify old results were saved
        const loaded = loadFromStorage(TEST_SESSION_ID);
        expect(loaded).not.toBeNull();
        expect(loaded).toHaveLength(2);
        expect(loaded![0].holder_score).toBeUndefined();

        // Simulate new results from API (with holder metrics)
        const incomingResults: CollectionWalletResult[] = [
            {
                wallet: '0xOldWallet1', // Same wallet as existing
                wallet_score: 85,
                label: 'Diamond',
                is_sweeper: false,
                flip_count: 2,
                confidence: 0.95,
                holder_score: 78,
                holder_label: 'Strong Holder',
                total_buys: 15,
                total_usd_spent: 12500,
                unique_collections: 8,
                avg_buy_price_usd: 833.33,
                mint_ratio: 0.6
            },
            {
                wallet: '0xNewWallet3', // New wallet not in existing results
                wallet_score: 90,
                label: 'Diamond',
                is_sweeper: false,
                flip_count: 0,
                confidence: 0.98,
                holder_score: 92,
                holder_label: 'Elite Holder',
                total_buys: 25,
                total_usd_spent: 50000,
                unique_collections: 15,
                avg_buy_price_usd: 2000,
                mint_ratio: 0.8
            }
        ];

        // Merge results
        const merged = mergeResults(loaded!, incomingResults);

        // Verify merged results
        expect(merged).toHaveLength(3); // 2 existing + 1 new

        // Find the updated wallet (0xOldWallet1)
        const updatedWallet = merged.find(r => r.wallet.toLowerCase() === '0xoldwallet1');
        expect(updatedWallet).toBeDefined();
        expect(updatedWallet!.holder_score).toBe(78);
        expect(updatedWallet!.holder_label).toBe('Strong Holder');
        expect(updatedWallet!.total_buys).toBe(15);

        // Find the preserved wallet (0xOldWallet2) - should still be there without holder metrics
        const preservedWallet = merged.find(r => r.wallet.toLowerCase() === '0xoldwallet2');
        expect(preservedWallet).toBeDefined();
        expect(preservedWallet!.wallet_score).toBe(72);
        expect(preservedWallet!.holder_score).toBeUndefined();

        // Find the new wallet (0xNewWallet3)
        const newWallet = merged.find(r => r.wallet.toLowerCase() === '0xnewwallet3');
        expect(newWallet).toBeDefined();
        expect(newWallet!.holder_score).toBe(92);
        expect(newWallet!.holder_label).toBe('Elite Holder');

        // Save merged results back to localStorage
        saveToStorage(TEST_SESSION_ID, merged);

        // Verify localStorage contains merged results
        const reloaded = loadFromStorage(TEST_SESSION_ID);
        expect(reloaded).not.toBeNull();
        expect(reloaded).toHaveLength(3);

        // Verify holder metrics are preserved in localStorage
        const reloadedUpdated = reloaded!.find(r => r.wallet.toLowerCase() === '0xoldwallet1');
        expect(reloadedUpdated!.holder_score).toBe(78);
        expect(reloadedUpdated!.holder_label).toBe('Strong Holder');
    });

    it('should preserve old results without holder metrics when incoming results also lack them', () => {
        // Existing results without holder metrics
        const existingResults: CollectionWalletResult[] = [
            {
                wallet: '0xWallet1',
                wallet_score: 80,
                label: 'Holder',
                is_sweeper: false,
                flip_count: 1,
                confidence: 0.9
            }
        ];

        saveToStorage(TEST_SESSION_ID, existingResults);

        // Incoming results also without holder metrics (e.g., backend hasn't deployed new version yet)
        const incomingResults: CollectionWalletResult[] = [
            {
                wallet: '0xWallet2',
                wallet_score: 75,
                label: 'Neutral',
                is_sweeper: false,
                flip_count: 3,
                confidence: 0.85
            }
        ];

        const loaded = loadFromStorage(TEST_SESSION_ID);
        const merged = mergeResults(loaded!, incomingResults);

        expect(merged).toHaveLength(2);
        expect(merged[0].holder_score).toBeUndefined();
        expect(merged[1].holder_score).toBeUndefined();

        // Save and verify
        saveToStorage(TEST_SESSION_ID, merged);
        const reloaded = loadFromStorage(TEST_SESSION_ID);
        expect(reloaded).toHaveLength(2);
    });

    it('should update existing wallet with new holder metrics when wallet appears in both sets', () => {
        // Existing result without holder metrics
        const existingResults: CollectionWalletResult[] = [
            {
                wallet: '0xSameWallet',
                wallet_score: 70,
                label: 'Neutral',
                is_sweeper: false,
                flip_count: 2,
                confidence: 0.8
            }
        ];

        saveToStorage(TEST_SESSION_ID, existingResults);

        // Incoming result with holder metrics for the same wallet
        const incomingResults: CollectionWalletResult[] = [
            {
                wallet: '0xSameWallet',
                wallet_score: 70,
                label: 'Neutral',
                is_sweeper: false,
                flip_count: 2,
                confidence: 0.8,
                holder_score: 65,
                holder_label: 'Moderate Holder',
                total_buys: 10,
                total_usd_spent: 5000,
                unique_collections: 5,
                avg_buy_price_usd: 500,
                mint_ratio: 0.5
            }
        ];

        const loaded = loadFromStorage(TEST_SESSION_ID);
        const merged = mergeResults(loaded!, incomingResults);

        // Should have only 1 result (same wallet)
        expect(merged).toHaveLength(1);

        // Should have holder metrics from incoming result
        expect(merged[0].holder_score).toBe(65);
        expect(merged[0].holder_label).toBe('Moderate Holder');
        expect(merged[0].total_buys).toBe(10);
        expect(merged[0].total_usd_spent).toBe(5000);
        expect(merged[0].unique_collections).toBe(5);
        expect(merged[0].avg_buy_price_usd).toBe(500);
        expect(merged[0].mint_ratio).toBe(0.5);

        // Save and verify persistence
        saveToStorage(TEST_SESSION_ID, merged);
        const reloaded = loadFromStorage(TEST_SESSION_ID);
        expect(reloaded![0].holder_score).toBe(65);
    });

    it('should handle case-insensitive wallet address matching during merge', () => {
        // Existing result with lowercase address
        const existingResults: CollectionWalletResult[] = [
            {
                wallet: '0xabcdef123456',
                wallet_score: 80,
                label: 'Holder',
                is_sweeper: false,
                flip_count: 1,
                confidence: 0.9
            }
        ];

        saveToStorage(TEST_SESSION_ID, existingResults);

        // Incoming result with uppercase address (same wallet)
        const incomingResults: CollectionWalletResult[] = [
            {
                wallet: '0xABCDEF123456',
                wallet_score: 80,
                label: 'Holder',
                is_sweeper: false,
                flip_count: 1,
                confidence: 0.9,
                holder_score: 85,
                holder_label: 'Strong Holder'
            }
        ];

        const loaded = loadFromStorage(TEST_SESSION_ID);
        const merged = mergeResults(loaded!, incomingResults);

        // Should have only 1 result (same wallet, case-insensitive match)
        expect(merged).toHaveLength(1);
        expect(merged[0].holder_score).toBe(85);
        expect(merged[0].holder_label).toBe('Strong Holder');
    });

    it('should handle partial holder metrics in incoming results', () => {
        // Existing result without holder metrics
        const existingResults: CollectionWalletResult[] = [
            {
                wallet: '0xWallet1',
                wallet_score: 75,
                label: 'Neutral',
                is_sweeper: false,
                flip_count: 2,
                confidence: 0.85
            }
        ];

        saveToStorage(TEST_SESSION_ID, existingResults);

        // Incoming result with partial holder metrics (only some fields)
        const incomingResults: CollectionWalletResult[] = [
            {
                wallet: '0xWallet2',
                wallet_score: 80,
                label: 'Holder',
                is_sweeper: false,
                flip_count: 1,
                confidence: 0.9,
                holder_score: 70,
                total_buys: 8
                // Other holder metrics are missing
            }
        ];

        const loaded = loadFromStorage(TEST_SESSION_ID);
        const merged = mergeResults(loaded!, incomingResults);

        expect(merged).toHaveLength(2);

        // Find the new wallet with partial holder metrics
        const newWallet = merged.find(r => r.wallet.toLowerCase() === '0xwallet2');
        expect(newWallet).toBeDefined();
        expect(newWallet!.holder_score).toBe(70);
        expect(newWallet!.total_buys).toBe(8);
        expect(newWallet!.holder_label).toBeUndefined();
        expect(newWallet!.total_usd_spent).toBeUndefined();

        // Save and verify
        saveToStorage(TEST_SESSION_ID, merged);
        const reloaded = loadFromStorage(TEST_SESSION_ID);
        const reloadedNew = reloaded!.find(r => r.wallet.toLowerCase() === '0xwallet2');
        expect(reloadedNew!.holder_score).toBe(70);
        expect(reloadedNew!.holder_label).toBeUndefined();
    });

    it('should handle empty existing results when merging with new results', () => {
        // No existing results in localStorage
        const existingResults: CollectionWalletResult[] = [];

        saveToStorage(TEST_SESSION_ID, existingResults);

        // Incoming results with holder metrics
        const incomingResults: CollectionWalletResult[] = [
            {
                wallet: '0xNewWallet1',
                wallet_score: 85,
                label: 'Diamond',
                is_sweeper: false,
                flip_count: 0,
                confidence: 0.95,
                holder_score: 88,
                holder_label: 'Elite Holder'
            }
        ];

        const loaded = loadFromStorage(TEST_SESSION_ID);
        const merged = mergeResults(loaded!, incomingResults);

        expect(merged).toHaveLength(1);
        expect(merged[0].holder_score).toBe(88);
        expect(merged[0].holder_label).toBe('Elite Holder');
    });

    it('should handle empty incoming results when merging with existing results', () => {
        // Existing results without holder metrics
        const existingResults: CollectionWalletResult[] = [
            {
                wallet: '0xExistingWallet',
                wallet_score: 80,
                label: 'Holder',
                is_sweeper: false,
                flip_count: 1,
                confidence: 0.9
            }
        ];

        saveToStorage(TEST_SESSION_ID, existingResults);

        // No incoming results (e.g., API returned empty array)
        const incomingResults: CollectionWalletResult[] = [];

        const loaded = loadFromStorage(TEST_SESSION_ID);
        const merged = mergeResults(loaded!, incomingResults);

        // Should preserve existing results
        expect(merged).toHaveLength(1);
        expect(merged[0].wallet).toBe('0xExistingWallet');
        expect(merged[0].holder_score).toBeUndefined();
    });

    it('should correctly serialize and deserialize holder metrics through localStorage', () => {
        // Create results with all holder metrics fields
        const resultsWithMetrics: CollectionWalletResult[] = [
            {
                wallet: '0xFullMetrics',
                wallet_score: 90,
                label: 'Diamond',
                is_sweeper: false,
                flip_count: 0,
                confidence: 0.98,
                holder_score: 95.5,
                holder_label: 'Elite Holder',
                total_buys: 30,
                total_usd_spent: 75000.50,
                unique_collections: 20,
                avg_buy_price_usd: 2500.02,
                mint_ratio: 0.85
            }
        ];

        // Save to localStorage
        saveToStorage(TEST_SESSION_ID, resultsWithMetrics);

        // Load from localStorage
        const loaded = loadFromStorage(TEST_SESSION_ID);

        // Verify all holder metrics are preserved with correct types
        expect(loaded).not.toBeNull();
        expect(loaded).toHaveLength(1);
        expect(loaded![0].holder_score).toBe(95.5);
        expect(loaded![0].holder_label).toBe('Elite Holder');
        expect(loaded![0].total_buys).toBe(30);
        expect(loaded![0].total_usd_spent).toBe(75000.50);
        expect(loaded![0].unique_collections).toBe(20);
        expect(loaded![0].avg_buy_price_usd).toBe(2500.02);
        expect(loaded![0].mint_ratio).toBe(0.85);

        // Verify types are correct (numbers are numbers, strings are strings)
        expect(typeof loaded![0].holder_score).toBe('number');
        expect(typeof loaded![0].holder_label).toBe('string');
        expect(typeof loaded![0].total_buys).toBe('number');
        expect(typeof loaded![0].total_usd_spent).toBe('number');
        expect(typeof loaded![0].unique_collections).toBe('number');
        expect(typeof loaded![0].avg_buy_price_usd).toBe('number');
        expect(typeof loaded![0].mint_ratio).toBe('number');
    });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { act } from 'react';
import CollectionResults from '../CollectionResults';
import type { CollectionWalletResult, CollectionStats } from '../../../types';

describe('CollectionResults - Backward Compatibility with Old localStorage Results', () => {
    const STORAGE_KEY = 'corge_scan_test_session_123';

    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
    });

    afterEach(() => {
        // Clean up after each test
        localStorage.clear();
    });

    it('should load and display old results from localStorage without holder metrics', () => {
        // Simulate old localStorage data (without holder metrics)
        const oldResults: CollectionWalletResult[] = [
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

        const oldStorageData = {
            sessionId: 'test_session_123',
            savedAt: Date.now(),
            results: oldResults
        };

        // Store old data in localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(oldStorageData));

        // Verify data was stored
        const stored = localStorage.getItem(STORAGE_KEY);
        expect(stored).not.toBeNull();

        // Parse the stored data
        const parsed = JSON.parse(stored!);
        expect(parsed.results).toHaveLength(2);
        expect(parsed.results[0].holder_score).toBeUndefined();
        expect(parsed.results[1].holder_score).toBeUndefined();

        // Now render the component with the old results
        const mockStats: CollectionStats = {
            total: 2,
            avg_score: 78.5,
            median_score: 78.5,
            min_score: 72,
            max_score: 85,
            sweepers: 0,
            new_wallets: 0,
            zero_flip_wallets: 0,
            label_distribution: { Diamond: 1, Holder: 1 },
            score_distribution: { '70-80': 1, '80-90': 1 }
        };

        // This should not throw any errors
        expect(() => {
            render(
                <CollectionResults
                    results={parsed.results}
                    stats={mockStats}
                    collectionName="Old Collection"
                    onReset={() => { }}
                />
            );
        }).not.toThrow();

        // Verify the component renders correctly
        expect(screen.getByText(/Old Collection/i)).toBeInTheDocument();
        expect(screen.getByText(/2 wallets/i)).toBeInTheDocument();

        // Verify no holder metrics section is displayed
        expect(screen.queryByText(/Holder metrics/i)).not.toBeInTheDocument();

        // Verify no console errors (this is implicit - if there were errors, the test would fail)
    });

    it('should handle mixed results (some with holder metrics, some without)', () => {
        // Simulate a scenario where localStorage has old results without holder metrics
        // and new results from API have holder metrics
        const mixedResults: CollectionWalletResult[] = [
            {
                wallet: '0xOldWallet',
                wallet_score: 85,
                label: 'Diamond',
                is_sweeper: false,
                flip_count: 2,
                confidence: 0.95
                // No holder metrics
            },
            {
                wallet: '0xNewWallet',
                wallet_score: 72,
                label: 'Holder',
                is_sweeper: false,
                flip_count: 1,
                confidence: 0.88,
                holder_score: 78,
                holder_label: 'Strong Holder',
                total_buys: 15,
                total_usd_spent: 12500,
                unique_collections: 8,
                avg_buy_price_usd: 833.33,
                mint_ratio: 0.6
            }
        ];

        const mockStats: CollectionStats = {
            total: 2,
            avg_score: 78.5,
            median_score: 78.5,
            min_score: 72,
            max_score: 85,
            sweepers: 0,
            new_wallets: 0,
            zero_flip_wallets: 0,
            label_distribution: { Diamond: 1, Holder: 1 },
            score_distribution: { '70-80': 1, '80-90': 1 }
        };

        // This should not throw any errors
        const { container } = render(
            <CollectionResults
                results={mixedResults}
                stats={mockStats}
                collectionName="Mixed Collection"
                onReset={() => { }}
            />
        );

        // Holder metrics section should be displayed (because at least one result has holder metrics)
        expect(screen.getByText(/Holder metrics/i)).toBeInTheDocument();

        // Verify table displays both results correctly
        const tableRows = container.querySelectorAll('tbody tr');
        expect(tableRows.length).toBe(2);

        // First row (old wallet) should display "—" for holder metrics
        expect(tableRows[0].textContent).toContain('—');

        // Second row (new wallet) should display holder metrics
        expect(tableRows[1].textContent).toContain('78.0');
        expect(screen.getByText('Strong Holder')).toBeInTheDocument();
    });

    it('should not throw errors when parsing localStorage with missing optional fields', () => {
        // Simulate localStorage data with minimal fields (old format)
        const minimalResults = [
            {
                wallet: '0xMinimal',
                wallet_score: 75,
                label: 'Neutral',
                is_sweeper: false,
                flip_count: 0,
                confidence: 0.8
            }
        ];

        const storageData = {
            sessionId: 'minimal_session',
            savedAt: Date.now(),
            results: minimalResults
        };

        localStorage.setItem('corge_scan_minimal_session', JSON.stringify(storageData));

        // Parse the data
        const stored = localStorage.getItem('corge_scan_minimal_session');
        const parsed = JSON.parse(stored!);

        const mockStats: CollectionStats = {
            total: 1,
            avg_score: 75,
            median_score: 75,
            min_score: 75,
            max_score: 75,
            sweepers: 0,
            new_wallets: 0,
            zero_flip_wallets: 0,
            label_distribution: { Neutral: 1 },
            score_distribution: { '70-80': 1 }
        };

        // Should render without errors
        expect(() => {
            render(
                <CollectionResults
                    results={parsed.results}
                    stats={mockStats}
                    collectionName="Minimal Collection"
                    onReset={() => { }}
                />
            );
        }).not.toThrow();

        // Verify component renders
        expect(screen.getByText(/Minimal Collection/i)).toBeInTheDocument();
    });
});

describe('CollectionResults - Holder Metrics Display', () => {
    const mockStats: CollectionStats = {
        total: 2,
        avg_score: 78.5,
        median_score: 78.5,
        min_score: 72,
        max_score: 85,
        sweepers: 0,
        new_wallets: 0,
        zero_flip_wallets: 0,
        label_distribution: { Diamond: 1, Holder: 1 },
        score_distribution: { '70-80': 1, '80-90': 1 }
    };

    it('should not display holder metrics section when no results have holder metrics', () => {
        const results: CollectionWalletResult[] = [{
            wallet: '0x123',
            wallet_score: 85,
            label: 'Diamond',
            is_sweeper: false,
            flip_count: 2,
            confidence: 0.95
        }];

        render(
            <CollectionResults
                results={results}
                stats={mockStats}
                collectionName="Test Collection"
                onReset={() => { }}
            />
        );

        // Holder metrics section should not be present
        expect(screen.queryByText(/Holder metrics/i)).not.toBeInTheDocument();
    });

    it('should display holder metrics section when results have holder metrics', () => {
        const results: CollectionWalletResult[] = [{
            wallet: '0x456',
            wallet_score: 72,
            label: 'Holder',
            is_sweeper: false,
            flip_count: 1,
            confidence: 0.88,
            holder_score: 78,
            holder_label: 'Strong Holder',
            total_buys: 15,
            total_usd_spent: 12500,
            unique_collections: 8,
            avg_buy_price_usd: 833.33,
            mint_ratio: 0.6
        }];

        render(
            <CollectionResults
                results={results}
                stats={mockStats}
                collectionName="Test Collection"
                onReset={() => { }}
            />
        );

        // Holder metrics section should be present
        expect(screen.getByText(/Holder metrics/i)).toBeInTheDocument();

        // Check for specific metric labels
        expect(screen.getByText(/Avg holder score/i)).toBeInTheDocument();
        expect(screen.getByText(/Avg total buys/i)).toBeInTheDocument();
        expect(screen.getByText(/Avg USD spent/i)).toBeInTheDocument();
        expect(screen.getByText(/Avg collections/i)).toBeInTheDocument();
        expect(screen.getByText(/Avg buy price/i)).toBeInTheDocument();
        expect(screen.getByText(/Avg mint ratio/i)).toBeInTheDocument();
    });

    it('should display correct average values for holder metrics', () => {
        const results: CollectionWalletResult[] = [
            {
                wallet: '0x111',
                wallet_score: 80,
                label: 'Holder',
                is_sweeper: false,
                flip_count: 1,
                confidence: 0.9,
                holder_score: 80,
                total_buys: 10,
                total_usd_spent: 10000,
                unique_collections: 5,
                avg_buy_price_usd: 1000,
                mint_ratio: 0.5
            },
            {
                wallet: '0x222',
                wallet_score: 70,
                label: 'Holder',
                is_sweeper: false,
                flip_count: 2,
                confidence: 0.85,
                holder_score: 70,
                total_buys: 20,
                total_usd_spent: 20000,
                unique_collections: 10,
                avg_buy_price_usd: 1000,
                mint_ratio: 0.4
            }
        ];

        render(
            <CollectionResults
                results={results}
                stats={mockStats}
                collectionName="Test Collection"
                onReset={() => { }}
            />
        );

        // Check that holder metrics section is displayed
        expect(screen.getByText(/Holder metrics/i)).toBeInTheDocument();

        // Average holder score should be (80 + 70) / 2 = 75.0
        expect(screen.getByText('75.0')).toBeInTheDocument();

        // Average total buys should be (10 + 20) / 2 = 15.0
        expect(screen.getByText('15.0')).toBeInTheDocument();

        // Average mint ratio should be (0.5 + 0.4) / 2 = 0.45 = 45.0%
        expect(screen.getByText('45.0%')).toBeInTheDocument();
    });

    it('should handle partial holder metrics gracefully', () => {
        const results: CollectionWalletResult[] = [{
            wallet: '0x789',
            wallet_score: 60,
            label: 'Neutral',
            is_sweeper: false,
            flip_count: 0,
            confidence: 0.75,
            holder_score: 65,
            total_buys: 5
            // Other holder metrics are missing
        }];

        const { container } = render(
            <CollectionResults
                results={results}
                stats={mockStats}
                collectionName="Test Collection"
                onReset={() => { }}
            />
        );

        // Holder metrics section should still be displayed
        expect(screen.getByText(/Holder metrics/i)).toBeInTheDocument();

        // Should display the available metrics in the summary section
        const summaryCards = container.querySelectorAll('.glass-card p.text-xl');
        const summaryValues = Array.from(summaryCards).map(p => p.textContent);
        expect(summaryValues).toContain('65.0'); // holder_score in summary
        expect(summaryValues).toContain('5.0'); // total_buys in summary
    });

    it('should not throw errors when rendering results without holder metrics', () => {
        const results: CollectionWalletResult[] = [{
            wallet: '0x123',
            wallet_score: 85,
            label: 'Diamond',
            is_sweeper: false,
            flip_count: 2,
            confidence: 0.95
        }];

        expect(() => {
            render(
                <CollectionResults
                    results={results}
                    stats={mockStats}
                    collectionName="Test Collection"
                    onReset={() => { }}
                />
            );
        }).not.toThrow();
    });

    it('should not display holder metrics columns in table when no results have holder metrics', () => {
        const results: CollectionWalletResult[] = [{
            wallet: '0x123',
            wallet_score: 85,
            label: 'Diamond',
            is_sweeper: false,
            flip_count: 2,
            confidence: 0.95
        }];

        render(
            <CollectionResults
                results={results}
                stats={mockStats}
                collectionName="Test Collection"
                onReset={() => { }}
            />
        );

        // Holder metrics columns should not be present in table header
        expect(screen.queryByText(/Holder Score/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Holder Label/i)).not.toBeInTheDocument();
    });

    it('should display holder metrics columns in table when results have holder metrics', () => {
        const results: CollectionWalletResult[] = [{
            wallet: '0x456',
            wallet_score: 72,
            label: 'Holder',
            is_sweeper: false,
            flip_count: 1,
            confidence: 0.88,
            holder_score: 78.5,
            holder_label: 'Strong Holder',
            total_buys: 15
        }];

        const { container } = render(
            <CollectionResults
                results={results}
                stats={mockStats}
                collectionName="Test Collection"
                onReset={() => { }}
            />
        );

        // Holder metrics columns should be present in table header
        const tableHeaders = container.querySelectorAll('th');
        const headerTexts = Array.from(tableHeaders).map(th => th.textContent);
        expect(headerTexts.some(text => text?.includes('Holder Score'))).toBe(true);
        expect(headerTexts.some(text => text?.includes('Holder Label'))).toBe(true);

        // Holder score should be formatted with one decimal place in the table
        const tableCells = container.querySelectorAll('td');
        const cellTexts = Array.from(tableCells).map(td => td.textContent);
        expect(cellTexts).toContain('78.5');

        // Holder label should be displayed as a badge
        expect(screen.getByText('Strong Holder')).toBeInTheDocument();
    });

    it('should display "—" for missing holder_score in table', () => {
        const results: CollectionWalletResult[] = [
            {
                wallet: '0x111',
                wallet_score: 80,
                label: 'Holder',
                is_sweeper: false,
                flip_count: 1,
                confidence: 0.9,
                holder_label: 'Strong Holder',
                total_buys: 10
            }
        ];

        const { container } = render(
            <CollectionResults
                results={results}
                stats={mockStats}
                collectionName="Test Collection"
                onReset={() => { }}
            />
        );

        // Holder metrics columns should be present
        const tableHeaders = container.querySelectorAll('th');
        const headerTexts = Array.from(tableHeaders).map(th => th.textContent);
        expect(headerTexts.some(text => text?.includes('Holder Score'))).toBe(true);
        expect(headerTexts.some(text => text?.includes('Holder Label'))).toBe(true);

        // Should display "—" for missing holder_score in table cells
        const tableCells = container.querySelectorAll('td');
        const cellTexts = Array.from(tableCells).map(td => td.textContent);
        expect(cellTexts).toContain('—');
    });

    it('should display "—" for missing holder_label in table', () => {
        const results: CollectionWalletResult[] = [
            {
                wallet: '0x222',
                wallet_score: 70,
                label: 'Holder',
                is_sweeper: false,
                flip_count: 2,
                confidence: 0.85,
                holder_score: 75.3,
                total_buys: 20
            }
        ];

        const { container } = render(
            <CollectionResults
                results={results}
                stats={mockStats}
                collectionName="Test Collection"
                onReset={() => { }}
            />
        );

        // Holder metrics columns should be present
        const tableHeaders = container.querySelectorAll('th');
        const headerTexts = Array.from(tableHeaders).map(th => th.textContent);
        expect(headerTexts.some(text => text?.includes('Holder Score'))).toBe(true);
        expect(headerTexts.some(text => text?.includes('Holder Label'))).toBe(true);

        // Should display holder_score in table
        const tableCells = container.querySelectorAll('td');
        const cellTexts = Array.from(tableCells).map(td => td.textContent);
        expect(cellTexts).toContain('75.3');

        // Should display "—" for missing holder_label
        expect(cellTexts).toContain('—');
    });
});

describe('CollectionResults - Holder Score Sorting', () => {
    const mockStats: CollectionStats = {
        total: 3,
        avg_score: 75,
        median_score: 75,
        min_score: 60,
        max_score: 90,
        sweepers: 0,
        new_wallets: 0,
        zero_flip_wallets: 0,
        label_distribution: { Diamond: 1, Holder: 2 },
        score_distribution: { '60-70': 1, '70-80': 1, '80-90': 1 }
    };

    it('should sort by holder_score in descending order by default', () => {
        const results: CollectionWalletResult[] = [
            {
                wallet: '0x111',
                wallet_score: 80,
                label: 'Holder',
                is_sweeper: false,
                flip_count: 1,
                confidence: 0.9,
                holder_score: 50
            },
            {
                wallet: '0x222',
                wallet_score: 70,
                label: 'Holder',
                is_sweeper: false,
                flip_count: 2,
                confidence: 0.85,
                holder_score: 90
            },
            {
                wallet: '0x333',
                wallet_score: 60,
                label: 'Holder',
                is_sweeper: false,
                flip_count: 0,
                confidence: 0.75,
                holder_score: 70
            }
        ];

        const { container } = render(
            <CollectionResults
                results={results}
                stats={mockStats}
                collectionName="Test Collection"
                onReset={() => { }}
            />
        );

        // Click on Holder Score header to sort
        const holderScoreHeader = screen.getByText(/Holder Score/);
        act(() => {
            holderScoreHeader.click();
        });

        // After clicking, results should be sorted by holder_score descending (90, 70, 50)
        const tableCells = container.querySelectorAll('tbody tr');
        expect(tableCells.length).toBe(3);

        // First row should have holder_score 90
        expect(tableCells[0].textContent).toContain('90.0');
        // Second row should have holder_score 70
        expect(tableCells[1].textContent).toContain('70.0');
        // Third row should have holder_score 50
        expect(tableCells[2].textContent).toContain('50.0');
    });

    it('should sort by holder_score in ascending order when clicked twice', () => {
        const results: CollectionWalletResult[] = [
            {
                wallet: '0x111',
                wallet_score: 80,
                label: 'Holder',
                is_sweeper: false,
                flip_count: 1,
                confidence: 0.9,
                holder_score: 50
            },
            {
                wallet: '0x222',
                wallet_score: 70,
                label: 'Holder',
                is_sweeper: false,
                flip_count: 2,
                confidence: 0.85,
                holder_score: 90
            },
            {
                wallet: '0x333',
                wallet_score: 60,
                label: 'Holder',
                is_sweeper: false,
                flip_count: 0,
                confidence: 0.75,
                holder_score: 70
            }
        ];

        const { container } = render(
            <CollectionResults
                results={results}
                stats={mockStats}
                collectionName="Test Collection"
                onReset={() => { }}
            />
        );

        // Click on Holder Score header twice to sort ascending
        const holderScoreHeader = screen.getByText(/Holder Score/);
        act(() => {
            holderScoreHeader.click(); // First click: descending
        });
        act(() => {
            holderScoreHeader.click(); // Second click: ascending
        });

        // After clicking twice, results should be sorted by holder_score ascending (50, 70, 90)
        const tableCells = container.querySelectorAll('tbody tr');
        expect(tableCells.length).toBe(3);

        // First row should have holder_score 50
        expect(tableCells[0].textContent).toContain('50.0');
        // Second row should have holder_score 70
        expect(tableCells[1].textContent).toContain('70.0');
        // Third row should have holder_score 90
        expect(tableCells[2].textContent).toContain('90.0');
    });

    it('should treat undefined holder_score as lowest value when sorting descending', () => {
        const results: CollectionWalletResult[] = [
            {
                wallet: '0x111',
                wallet_score: 80,
                label: 'Holder',
                is_sweeper: false,
                flip_count: 1,
                confidence: 0.9,
                holder_score: 50
            },
            {
                wallet: '0x222',
                wallet_score: 70,
                label: 'Holder',
                is_sweeper: false,
                flip_count: 2,
                confidence: 0.85
                // holder_score is undefined
            },
            {
                wallet: '0x333',
                wallet_score: 60,
                label: 'Holder',
                is_sweeper: false,
                flip_count: 0,
                confidence: 0.75,
                holder_score: 90
            }
        ];

        const { container } = render(
            <CollectionResults
                results={results}
                stats={mockStats}
                collectionName="Test Collection"
                onReset={() => { }}
            />
        );

        // Click on Holder Score header to sort descending
        const holderScoreHeader = screen.getByText(/Holder Score/);
        act(() => {
            holderScoreHeader.click();
        });

        // Results should be sorted: 90, 50, undefined (last)
        const tableCells = container.querySelectorAll('tbody tr');
        expect(tableCells.length).toBe(3);

        // First row should have holder_score 90
        expect(tableCells[0].textContent).toContain('90.0');
        // Second row should have holder_score 50
        expect(tableCells[1].textContent).toContain('50.0');
        // Third row should have undefined holder_score (displayed as "—")
        expect(tableCells[2].textContent).toContain('—');
    });

    it('should treat undefined holder_score as lowest value when sorting ascending', () => {
        const results: CollectionWalletResult[] = [
            {
                wallet: '0x111',
                wallet_score: 80,
                label: 'Holder',
                is_sweeper: false,
                flip_count: 1,
                confidence: 0.9,
                holder_score: 50
            },
            {
                wallet: '0x222',
                wallet_score: 70,
                label: 'Holder',
                is_sweeper: false,
                flip_count: 2,
                confidence: 0.85
                // holder_score is undefined
            },
            {
                wallet: '0x333',
                wallet_score: 60,
                label: 'Holder',
                is_sweeper: false,
                flip_count: 0,
                confidence: 0.75,
                holder_score: 90
            }
        ];

        const { container } = render(
            <CollectionResults
                results={results}
                stats={mockStats}
                collectionName="Test Collection"
                onReset={() => { }}
            />
        );

        // Click on Holder Score header twice to sort ascending
        const holderScoreHeader = screen.getByText(/Holder Score/);
        act(() => {
            holderScoreHeader.click(); // First click: descending
        });
        act(() => {
            holderScoreHeader.click(); // Second click: ascending
        });

        // Results should be sorted: undefined (first), 50, 90
        const tableCells = container.querySelectorAll('tbody tr');
        expect(tableCells.length).toBe(3);

        // First row should have undefined holder_score (displayed as "—")
        expect(tableCells[0].textContent).toContain('—');
        // Second row should have holder_score 50
        expect(tableCells[1].textContent).toContain('50.0');
        // Third row should have holder_score 90
        expect(tableCells[2].textContent).toContain('90.0');
    });

    it('should handle multiple undefined holder_scores when sorting', () => {
        const results: CollectionWalletResult[] = [
            {
                wallet: '0x111',
                wallet_score: 80,
                label: 'Holder',
                is_sweeper: false,
                flip_count: 1,
                confidence: 0.9
                // holder_score is undefined
            },
            {
                wallet: '0x222',
                wallet_score: 70,
                label: 'Holder',
                is_sweeper: false,
                flip_count: 2,
                confidence: 0.85,
                holder_score: 75
            },
            {
                wallet: '0x333',
                wallet_score: 60,
                label: 'Holder',
                is_sweeper: false,
                flip_count: 0,
                confidence: 0.75
                // holder_score is undefined
            }
        ];

        const { container } = render(
            <CollectionResults
                results={results}
                stats={mockStats}
                collectionName="Test Collection"
                onReset={() => { }}
            />
        );

        // Click on Holder Score header to sort descending
        const holderScoreHeader = screen.getByText(/Holder Score/);
        act(() => {
            holderScoreHeader.click();
        });

        // Results should be sorted: 75, undefined, undefined (both at the end)
        const tableCells = container.querySelectorAll('tbody tr');
        expect(tableCells.length).toBe(3);

        // First row should have holder_score 75
        expect(tableCells[0].textContent).toContain('75.0');
        // Second and third rows should have undefined holder_score (displayed as "—")
        expect(tableCells[1].textContent).toContain('—');
        expect(tableCells[2].textContent).toContain('—');
    });
});

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { CollectionWalletResult, CollectionStats } from '../../types';
import { classifyScore, SCORE_CATEGORY_STYLES } from '../../utils/score';

interface Props {
    results: CollectionWalletResult[];
    stats: CollectionStats;
    collectionName: string;
    onReset: () => void;
    onRescan?: (zeroAddresses: string[]) => void;
    failedAddresses?: Array<{ wallet: string; error: string }>;
}

type SortKey = 'wallet_score' | 'flip_count' | 'confidence' | 'label' | 'holder_score';
type SortDir = 'asc' | 'desc';

/**
 * Export collection results to CSV format.
 * 
 * Includes all holder metrics fields in the export. For results without holder metrics,
 * empty strings are used to maintain CSV structure consistency. This ensures:
 * - Backward compatibility: old results export with empty holder metric columns
 * - Forward compatibility: new results export with all available data
 * - Consistent CSV structure: all rows have the same number of columns
 * 
 * @param results - Array of wallet results to export
 * @param name - Collection name used for the filename
 */
function exportCSV(results: CollectionWalletResult[], name: string) {
    const header = 'wallet,wallet_score,label,is_sweeper,flip_count,confidence,holder_score,holder_label,total_buys,total_usd_spent,unique_collections,avg_buy_price_usd,mint_ratio';
    const rows = results.map(r =>
        `${r.wallet},${r.wallet_score},${r.label},${r.is_sweeper},${r.flip_count},${r.confidence},${r.holder_score ?? ''},${r.holder_label ?? ''},${r.total_buys ?? ''},${r.total_usd_spent ?? ''},${r.unique_collections ?? ''},${r.avg_buy_price_usd ?? ''},${r.mint_ratio ?? ''}`
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name || 'collection'}_scores.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Export failed addresses to CSV format.
 * 
 * @param failedAddresses - Array of failed wallet addresses with error messages
 * @param name - Collection name used for the filename
 */
function exportFailedCSV(failedAddresses: Array<{ wallet: string; error: string }>, name: string) {
    const header = 'wallet,error';
    const rows = failedAddresses.map(f => `${f.wallet},"${f.error.replace(/"/g, '""')}"`);
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name || 'collection'}_failed.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

export default function CollectionResults({ results, stats, collectionName, onReset, onRescan, failedAddresses }: Props) {
    const [sortKey, setSortKey] = useState<SortKey>('wallet_score');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [labelFilter, setLabelFilter] = useState<string>('all');
    const [newWalletOnly, setNewWalletOnly] = useState(false);
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 50;

    const newWalletCount = useMemo(() =>
        results.filter(r => r.is_new_wallet).length,
        [results]);

    const zeroScoreCount = useMemo(() =>
        results.filter(r => r.wallet_score === 0).length,
        [results]);

    const labels = useMemo(() => {
        const s = new Set(
            results
                .map(r => r.label)
                .filter(l => l !== 'New Wallet')
        );
        return ['all', ...Array.from(s).sort()];
    }, [results]);

    /**
     * Holder Metrics Display Logic
     * 
     * Holder metrics are optional fields that may not be present in all results.
     * This can occur when:
     * - Loading older results from localStorage (backward compatibility)
     * - API returns results without holder metrics
     * - Partial data availability for certain wallets
     * 
     * The UI gracefully handles missing metrics by:
     * 1. Checking if ANY result has holder metrics before showing the section
     * 2. Using optional chaining (?.) and nullish coalescing (??) for safe access
     * 3. Displaying "—" for missing individual values
     * 4. Only calculating averages from results that have the metrics
     */

    // Check if any results have holder metrics to determine if we should show the holder metrics section
    const hasHolderMetrics = useMemo(() =>
        results.some(r =>
            r.holder_score !== undefined ||
            r.holder_label !== undefined ||
            r.total_buys !== undefined ||
            r.total_usd_spent !== undefined ||
            r.unique_collections !== undefined ||
            r.avg_buy_price_usd !== undefined ||
            r.mint_ratio !== undefined
        ),
        [results]);

    // Calculate average holder metrics across all results that have holder_score defined.
    // This ensures we only average over wallets with complete holder metrics data,
    // maintaining accuracy when mixing old results (no metrics) with new results (with metrics).
    const holderMetricsAvg = useMemo(() => {
        if (!hasHolderMetrics) return null;

        const withMetrics = results.filter(r => r.holder_score !== undefined);
        if (withMetrics.length === 0) return null;

        const sum = withMetrics.reduce((acc, r) => ({
            holder_score: acc.holder_score + (r.holder_score ?? 0),
            total_buys: acc.total_buys + (r.total_buys ?? 0),
            total_usd_spent: acc.total_usd_spent + (r.total_usd_spent ?? 0),
            unique_collections: acc.unique_collections + (r.unique_collections ?? 0),
            avg_buy_price_usd: acc.avg_buy_price_usd + (r.avg_buy_price_usd ?? 0),
            mint_ratio: acc.mint_ratio + (r.mint_ratio ?? 0),
        }), {
            holder_score: 0,
            total_buys: 0,
            total_usd_spent: 0,
            unique_collections: 0,
            avg_buy_price_usd: 0,
            mint_ratio: 0,
        });

        return {
            holder_score: sum.holder_score / withMetrics.length,
            total_buys: sum.total_buys / withMetrics.length,
            total_usd_spent: sum.total_usd_spent / withMetrics.length,
            unique_collections: sum.unique_collections / withMetrics.length,
            avg_buy_price_usd: sum.avg_buy_price_usd / withMetrics.length,
            mint_ratio: sum.mint_ratio / withMetrics.length,
        };
    }, [results, hasHolderMetrics]);

    // Sort and filter results based on current sort key, direction, label filter, and new wallet filter.
    // Sorting logic handles undefined values (e.g., missing holder_score) by treating them as lowest values.
    // This ensures results without holder metrics appear at the end when sorting by holder_score descending.
    const sorted = useMemo(() => {
        let filtered = labelFilter === 'all' ? results : results.filter(r => r.label === labelFilter);
        if (newWalletOnly) filtered = filtered.filter(r => r.is_new_wallet);
        return [...filtered].sort((a, b) => {
            const av = a[sortKey] as number | string | undefined;
            const bv = b[sortKey] as number | string | undefined;

            // Handle undefined values - treat as lowest value
            if (av === undefined && bv === undefined) return 0;
            if (av === undefined) return sortDir === 'desc' ? 1 : -1;
            if (bv === undefined) return sortDir === 'desc' ? -1 : 1;

            if (typeof av === 'number' && typeof bv === 'number') {
                return sortDir === 'desc' ? bv - av : av - bv;
            }
            return sortDir === 'desc'
                ? String(bv).localeCompare(String(av))
                : String(av).localeCompare(String(bv));
        });
    }, [results, sortKey, sortDir, labelFilter, newWalletOnly]);

    const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const totalPages = Math.ceil(sorted.length / PAGE_SIZE);

    function toggleSort(key: SortKey) {
        if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
        else { setSortKey(key); setSortDir('desc'); }
        setPage(0);
    }

    const SortIcon = ({ k }: { k: SortKey }) => (
        <span style={{ opacity: sortKey === k ? 1 : 0.3 }}>
            {sortKey === k ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ' ↕'}
        </span>
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="w-full flex flex-col gap-5"
        >
            {/* Summary stats */}
            <div className="glass-card p-6 md:p-8">
                <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                    <h2
                        className="text-lg font-bold"
                        style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-corge-offwhite)' }}
                    >
                        {collectionName || 'Collection'} — Results
                    </h2>
                    <div className="flex gap-2 flex-wrap">
                        {onRescan && zeroScoreCount > 0 && (
                            <button
                                onClick={() => {
                                    const zeros = results.filter(r => r.wallet_score === 0).map(r => r.wallet);
                                    onRescan(zeros);
                                }}
                                className="text-xs px-3 py-2 rounded-lg transition-all flex items-center gap-1.5"
                                style={{
                                    background: 'rgba(255,90,31,0.12)',
                                    border: '1px solid rgba(255,90,31,0.3)',
                                    color: 'var(--color-corge-orange)',
                                    fontFamily: 'var(--font-body)',
                                    cursor: 'pointer',
                                }}
                            >
                                🔄 Rescan {zeroScoreCount.toLocaleString()} zero-score wallets
                            </button>
                        )}
                        <button
                            onClick={() => exportCSV(results, collectionName)}
                            className="text-xs px-3 py-2 rounded-lg transition-all"
                            style={{
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid var(--glass-border)',
                                color: 'rgba(242,242,242,0.7)',
                                fontFamily: 'var(--font-body)',
                                cursor: 'pointer',
                            }}
                        >
                            ↓ Export CSV
                        </button>
                        {failedAddresses && failedAddresses.length > 0 && (
                            <button
                                onClick={() => exportFailedCSV(failedAddresses, collectionName)}
                                className="text-xs px-3 py-2 rounded-lg transition-all flex items-center gap-1.5"
                                style={{
                                    background: 'rgba(248,113,113,0.12)',
                                    border: '1px solid rgba(248,113,113,0.3)',
                                    color: '#f87171',
                                    fontFamily: 'var(--font-body)',
                                    cursor: 'pointer',
                                }}
                            >
                                ⚠ Export {failedAddresses.length.toLocaleString()} failed
                            </button>
                        )}
                        <button
                            onClick={onReset}
                            className="text-xs px-3 py-2 rounded-lg transition-all"
                            style={{
                                background: 'transparent',
                                border: '1px solid var(--glass-border)',
                                color: 'rgba(242,242,242,0.5)',
                                fontFamily: 'var(--font-body)',
                                cursor: 'pointer',
                            }}
                        >
                            New scan
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                    {[
                        { label: 'Wallets scored', value: stats.total.toLocaleString(), color: 'var(--color-corge-orange)' },
                        { label: 'Avg score', value: stats.avg_score.toFixed(2), color: 'var(--color-corge-offwhite)' },
                        { label: 'Sweepers', value: stats.sweepers.toLocaleString(), color: '#f87171' },
                        { label: 'New wallets', value: stats.new_wallets.toLocaleString(), color: '#a3a3a3' },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="rounded-xl px-3 py-3 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)' }}>
                            <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'rgba(242,242,242,0.4)', fontFamily: 'var(--font-body)' }}>{label}</p>
                            <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)', color }}>{value}</p>
                        </div>
                    ))}
                </div>

                {/* Score distribution */}
                <div>
                    <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'rgba(242,242,242,0.4)', fontFamily: 'var(--font-body)' }}>Score distribution</p>
                    <div className="flex gap-1 items-end" style={{ height: '64px' }}>
                        {Object.entries(stats.score_distribution).map(([range, count]) => {
                            const max = Math.max(...Object.values(stats.score_distribution));
                            const heightPx = max > 0 ? Math.max(2, Math.round((count / max) * 52)) : 0;
                            return (
                                <div key={range} className="flex-1 flex flex-col items-center justify-end gap-1" style={{ height: '64px' }}>
                                    <motion.div
                                        className="w-full rounded-t"
                                        style={{ background: 'var(--color-corge-orange)', opacity: 0.75 }}
                                        initial={{ height: 0 }}
                                        animate={{ height: `${heightPx}px` }}
                                        transition={{ duration: 0.6, delay: 0.1 }}
                                        title={`${range}: ${count.toLocaleString()}`}
                                    />
                                    <span style={{ color: 'rgba(242,242,242,0.3)', fontFamily: 'var(--font-body)', fontSize: '10px', lineHeight: 1 }}>{range}</span>
                                </div>
                            );
                        })}
                    </div>
                    {/* Count labels */}
                    <div className="flex gap-1 mt-1">
                        {Object.entries(stats.score_distribution).map(([range, count]) => (
                            <div key={range} className="flex-1 text-center">
                                <span style={{ color: 'rgba(242,242,242,0.25)', fontFamily: 'var(--font-body)', fontSize: '9px' }}>
                                    {count > 0 ? count.toLocaleString() : ''}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Holder metrics section - only show if any results have holder metrics.
                    This conditional rendering ensures backward compatibility:
                    - Old results without holder metrics: section is hidden
                    - New results with holder metrics: section is displayed
                    - Mixed results: section shows averages from results with metrics
                */}
                {hasHolderMetrics && holderMetricsAvg && (
                    <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--glass-border)' }}>
                        <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'rgba(242,242,242,0.4)', fontFamily: 'var(--font-body)' }}>Holder metrics</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                                {
                                    label: 'Avg holder score',
                                    value: holderMetricsAvg.holder_score !== undefined ? holderMetricsAvg.holder_score.toFixed(1) : '—',
                                    color: 'var(--color-corge-orange)'
                                },
                                {
                                    label: 'Avg total buys',
                                    value: holderMetricsAvg.total_buys !== undefined ? holderMetricsAvg.total_buys.toFixed(1) : '—',
                                    color: 'var(--color-corge-offwhite)'
                                },
                                {
                                    label: 'Avg USD spent',
                                    value: holderMetricsAvg.total_usd_spent !== undefined ? `$${holderMetricsAvg.total_usd_spent.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—',
                                    color: '#34d399'
                                },
                                {
                                    label: 'Avg collections',
                                    value: holderMetricsAvg.unique_collections !== undefined ? holderMetricsAvg.unique_collections.toFixed(1) : '—',
                                    color: '#a3a3a3'
                                },
                                {
                                    label: 'Avg buy price',
                                    value: holderMetricsAvg.avg_buy_price_usd !== undefined ? `$${holderMetricsAvg.avg_buy_price_usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—',
                                    color: '#60a5fa'
                                },
                                {
                                    label: 'Avg mint ratio',
                                    value: holderMetricsAvg.mint_ratio !== undefined ? `${(holderMetricsAvg.mint_ratio * 100).toFixed(1)}%` : '—',
                                    color: '#c084fc'
                                },
                            ].map(({ label, value, color }) => (
                                <div key={label} className="rounded-xl px-3 py-3 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)' }}>
                                    <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'rgba(242,242,242,0.4)', fontFamily: 'var(--font-body)' }}>{label}</p>
                                    <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)', color }}>{value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Results table */}
            <div className="glass-card p-4 md:p-6">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <p className="text-sm font-semibold" style={{ fontFamily: 'var(--font-body)', color: 'rgba(242,242,242,0.7)' }}>
                        {sorted.length.toLocaleString()} wallets
                    </p>
                    <div className="flex gap-1.5 flex-wrap items-center">
                        {/* New Wallet toggle */}
                        {newWalletCount > 0 && (
                            <button
                                onClick={() => { setNewWalletOnly(v => !v); setPage(0); }}
                                className="text-xs px-2.5 py-1 rounded-full transition-all flex items-center gap-1"
                                style={{
                                    background: newWalletOnly ? 'rgba(107,114,128,0.5)' : 'rgba(107,114,128,0.12)',
                                    color: newWalletOnly ? '#e5e7eb' : '#9ca3af',
                                    border: `1px solid ${newWalletOnly ? 'rgba(156,163,175,0.5)' : 'rgba(107,114,128,0.25)'}`,
                                    fontFamily: 'var(--font-body)',
                                    cursor: 'pointer',
                                }}
                            >
                                🆕 New Wallet
                                <span
                                    className="px-1 rounded"
                                    style={{
                                        background: 'rgba(255,255,255,0.1)',
                                        fontSize: '10px',
                                    }}
                                >
                                    {newWalletCount}
                                </span>
                            </button>
                        )}
                        {/* Label filter pills */}
                        {labels.map(l => (
                            <button
                                key={l}
                                onClick={() => { setLabelFilter(l); setPage(0); }}
                                className="text-xs px-2.5 py-1 rounded-full transition-all"
                                style={{
                                    background: labelFilter === l ? 'var(--color-corge-orange)' : 'rgba(255,255,255,0.06)',
                                    color: labelFilter === l ? '#fff' : 'rgba(242,242,242,0.5)',
                                    border: '1px solid transparent',
                                    fontFamily: 'var(--font-body)',
                                    cursor: 'pointer',
                                }}
                            >
                                {l}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto scrollbar-corge">
                    <table className="w-full text-xs" style={{ fontFamily: 'var(--font-body)', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                <th className="text-left py-2 px-2" style={{ color: 'rgba(242,242,242,0.4)', fontWeight: 500 }}>Wallet</th>
                                <th className="text-right py-2 px-2 cursor-pointer select-none" style={{ color: 'rgba(242,242,242,0.4)', fontWeight: 500 }} onClick={() => toggleSort('wallet_score')}>
                                    Score <SortIcon k="wallet_score" />
                                </th>
                                <th className="text-left py-2 px-2 cursor-pointer select-none" style={{ color: 'rgba(242,242,242,0.4)', fontWeight: 500 }} onClick={() => toggleSort('label')}>
                                    Label <SortIcon k="label" />
                                </th>
                                {/* Holder metrics columns - only shown when hasHolderMetrics is true.
                                    Uses optional chaining to safely access potentially undefined values.
                                    Displays "—" for missing values to indicate data unavailability.
                                */}
                                {hasHolderMetrics && (
                                    <>
                                        <th className="text-right py-2 px-2 hidden md:table-cell cursor-pointer select-none" style={{ color: 'rgba(242,242,242,0.4)', fontWeight: 500 }} onClick={() => toggleSort('holder_score')}>
                                            Holder Score <SortIcon k="holder_score" />
                                        </th>
                                        <th className="text-left py-2 px-2 hidden md:table-cell" style={{ color: 'rgba(242,242,242,0.4)', fontWeight: 500 }}>
                                            Holder Label
                                        </th>
                                    </>
                                )}
                                <th className="text-right py-2 px-2 cursor-pointer select-none hidden md:table-cell" style={{ color: 'rgba(242,242,242,0.4)', fontWeight: 500 }} onClick={() => toggleSort('flip_count')}>
                                    Flips <SortIcon k="flip_count" />
                                </th>
                                <th className="text-center py-2 px-2 hidden md:table-cell" style={{ color: 'rgba(242,242,242,0.4)', fontWeight: 500 }}>Sweeper</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.map((r, i) => {
                                const cat = classifyScore(r.wallet_score);
                                const style = SCORE_CATEGORY_STYLES[cat];
                                return (
                                    <tr
                                        key={r.wallet}
                                        style={{
                                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                                            background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                                        }}
                                    >
                                        <td className="py-2 px-2" style={{ color: 'rgba(242,242,242,0.5)', fontFamily: 'monospace' }}>
                                            {r.wallet.slice(0, 6)}...{r.wallet.slice(-4)}
                                        </td>
                                        <td className="py-2 px-2 text-right font-bold" style={{ color: style.colorClass.replace('text-[', '').replace(']', '') }}>
                                            {r.wallet_score.toFixed(1)}
                                        </td>
                                        <td className="py-2 px-2">
                                            {r.label === 'New Wallet' ? (
                                                <span
                                                    className="px-2 py-0.5 rounded text-xs"
                                                    style={{
                                                        background: 'rgba(107,114,128,0.15)',
                                                        color: '#9ca3af',
                                                        border: '1px solid rgba(107,114,128,0.25)',
                                                        fontFamily: 'var(--font-body)',
                                                    }}
                                                >
                                                    🆕 New Wallet
                                                </span>
                                            ) : (
                                                <span className={`px-2 py-0.5 rounded-full text-xs ${style.badgeClass}`}>
                                                    {r.label}
                                                    {r.is_new_wallet && (
                                                        <span className="ml-1 opacity-70">🆕</span>
                                                    )}
                                                </span>
                                            )}
                                        </td>
                                        {/* Holder metrics data cells - safe access with optional chaining.
                                            - holder_score: displays numeric value with 1 decimal place, or "—" if undefined
                                            - holder_label: displays badge with label text, or "—" if undefined
                                            This pattern ensures no runtime errors when accessing optional fields.
                                        */}
                                        {hasHolderMetrics && (
                                            <>
                                                <td className="py-2 px-2 text-right hidden md:table-cell" style={{ color: 'rgba(242,242,242,0.5)' }}>
                                                    {r.holder_score !== undefined ? r.holder_score.toFixed(1) : '—'}
                                                </td>
                                                <td className="py-2 px-2 hidden md:table-cell">
                                                    {r.holder_label ? (
                                                        <span
                                                            className="px-2 py-0.5 rounded-full text-xs"
                                                            style={{
                                                                background: 'rgba(96,165,250,0.15)',
                                                                color: '#60a5fa',
                                                                border: '1px solid rgba(96,165,250,0.25)',
                                                                fontFamily: 'var(--font-body)',
                                                            }}
                                                        >
                                                            {r.holder_label}
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: 'rgba(242,242,242,0.3)' }}>—</span>
                                                    )}
                                                </td>
                                            </>
                                        )}
                                        <td className="py-2 px-2 text-right hidden md:table-cell" style={{ color: 'rgba(242,242,242,0.5)' }}>
                                            {r.flip_count}
                                        </td>
                                        <td className="py-2 px-2 text-center hidden md:table-cell">
                                            {r.is_sweeper ? <span style={{ color: '#f87171' }}>🧹</span> : <span style={{ color: '#34d399' }}>—</span>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                        <button
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="text-xs px-3 py-1.5 rounded-lg"
                            style={{
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid var(--glass-border)',
                                color: page === 0 ? 'rgba(242,242,242,0.2)' : 'rgba(242,242,242,0.6)',
                                cursor: page === 0 ? 'not-allowed' : 'pointer',
                                fontFamily: 'var(--font-body)',
                            }}
                        >
                            ← Prev
                        </button>
                        <span className="text-xs" style={{ color: 'rgba(242,242,242,0.4)', fontFamily: 'var(--font-body)' }}>
                            {page + 1} / {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={page >= totalPages - 1}
                            className="text-xs px-3 py-1.5 rounded-lg"
                            style={{
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid var(--glass-border)',
                                color: page >= totalPages - 1 ? 'rgba(242,242,242,0.2)' : 'rgba(242,242,242,0.6)',
                                cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
                                fontFamily: 'var(--font-body)',
                            }}
                        >
                            Next →
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

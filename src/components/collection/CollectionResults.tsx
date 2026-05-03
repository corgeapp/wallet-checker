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
}

type SortKey = 'wallet_score' | 'flip_count' | 'confidence' | 'label';
type SortDir = 'asc' | 'desc';

function exportCSV(results: CollectionWalletResult[], name: string) {
    const header = 'wallet,wallet_score,label,is_sweeper,flip_count,confidence';
    const rows = results.map(r =>
        `${r.wallet},${r.wallet_score},${r.label},${r.is_sweeper},${r.flip_count},${r.confidence}`
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name || 'collection'}_scores.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

export default function CollectionResults({ results, stats, collectionName, onReset, onRescan }: Props) {
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

    const sorted = useMemo(() => {
        let filtered = labelFilter === 'all' ? results : results.filter(r => r.label === labelFilter);
        if (newWalletOnly) filtered = filtered.filter(r => r.is_new_wallet);
        return [...filtered].sort((a, b) => {
            const av = a[sortKey] as number | string;
            const bv = b[sortKey] as number | string;
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

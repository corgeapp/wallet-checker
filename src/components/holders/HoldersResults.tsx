import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { HoldersResponse } from '../../api/client';

interface Props {
    data: HoldersResponse;
    contract: string;
    chain: number;
    onReset: () => void;
    onSendToScanner: (data: HoldersResponse) => void;
}

export default function HoldersResults({ data, contract, chain, onReset, onSendToScanner }: Props) {
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 50;

    const totalPages = Math.ceil(data.holders.length / PAGE_SIZE);
    const paginatedHolders = useMemo(() => {
        const start = page * PAGE_SIZE;
        return data.holders.slice(start, start + PAGE_SIZE);
    }, [data.holders, page]);

    function exportCSV() {
        const header = 'address,token_count';
        const rows = data.holders.map(h => `${h.address},${h.token_count}`);
        const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `holders_${contract.slice(0, 8)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    const chainName = chain === 1 ? 'Ethereum' : chain === 137 ? 'Polygon' : chain === 8453 ? 'Base' : `Chain ${chain}`;

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="w-full flex flex-col gap-5"
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-bold mb-1" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-corge-offwhite)' }}>
                        Current Holders
                    </h2>
                    <p className="text-sm" style={{ color: 'rgba(242,242,242,0.5)', fontFamily: 'var(--font-body)' }}>
                        {contract.slice(0, 8)}...{contract.slice(-6)} · {chainName}
                    </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={() => onSendToScanner(data)}
                        className="text-xs px-3 py-2 rounded-lg transition-all"
                        style={{
                            background: 'var(--color-corge-orange)',
                            color: '#fff',
                            fontFamily: 'var(--font-body)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            border: 'none',
                        }}
                    >
                        → Send to Scanner
                    </button>
                    <button
                        onClick={exportCSV}
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
                        New fetch
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                    { label: 'Total Holders', value: data.total_holders.toLocaleString(), color: 'var(--color-corge-orange)' },
                    { label: 'Total Tokens', value: data.total_tokens.toLocaleString(), color: 'var(--color-corge-offwhite)' },
                    { label: 'Avg per Holder', value: (data.total_tokens / data.total_holders).toFixed(2), color: '#60a5fa' },
                ].map(({ label, value, color }) => (
                    <div key={label} className="glass-card p-4 text-center">
                        <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'rgba(242,242,242,0.4)', fontFamily: 'var(--font-body)' }}>
                            {label}
                        </p>
                        <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)', color }}>
                            {value}
                        </p>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full" style={{ fontFamily: 'var(--font-body)' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                <th className="text-left px-4 py-3 text-xs uppercase tracking-wide" style={{ color: 'rgba(242,242,242,0.4)' }}>
                                    Address
                                </th>
                                <th className="text-right px-4 py-3 text-xs uppercase tracking-wide" style={{ color: 'rgba(242,242,242,0.4)' }}>
                                    Token Count
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedHolders.map((holder, idx) => (
                                <tr key={holder.address} style={{ borderBottom: idx < paginatedHolders.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                                    <td className="px-4 py-3 text-sm" style={{ fontFamily: 'monospace', color: 'var(--color-corge-offwhite)' }}>
                                        {holder.address}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-right font-semibold" style={{ color: 'var(--color-corge-orange)' }}>
                                        {holder.token_count.toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: 'var(--glass-border)' }}>
                        <p className="text-xs" style={{ color: 'rgba(242,242,242,0.5)', fontFamily: 'var(--font-body)' }}>
                            Page {page + 1} of {totalPages} · Showing {paginatedHolders.length} of {data.holders.length}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                                disabled={page === 0}
                                className="text-xs px-3 py-1.5 rounded"
                                style={{
                                    background: page === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
                                    border: '1px solid var(--glass-border)',
                                    color: page === 0 ? 'rgba(242,242,242,0.3)' : 'rgba(242,242,242,0.7)',
                                    cursor: page === 0 ? 'not-allowed' : 'pointer',
                                    fontFamily: 'var(--font-body)',
                                }}
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                disabled={page === totalPages - 1}
                                className="text-xs px-3 py-1.5 rounded"
                                style={{
                                    background: page === totalPages - 1 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
                                    border: '1px solid var(--glass-border)',
                                    color: page === totalPages - 1 ? 'rgba(242,242,242,0.3)' : 'rgba(242,242,242,0.7)',
                                    cursor: page === totalPages - 1 ? 'not-allowed' : 'pointer',
                                    fontFamily: 'var(--font-body)',
                                }}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

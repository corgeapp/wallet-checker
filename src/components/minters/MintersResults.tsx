import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { MintersResponse, MintersFields } from '../../types';
import { getMintersCSVUrl } from '../../api/client';

interface Props {
    data: MintersResponse;
    contract: string;
    chain: number;
    fields: MintersFields;
    onReset: () => void;
    onSendToScanner: (data: MintersResponse) => void;
}

type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 100;

function downloadJSON(data: MintersResponse, fields: MintersFields) {
    const payload = fields === 'address'
        ? { addresses: data.results.map(r => r.address) }
        : data;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `minters_${data.contract.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

export default function MintersResults({ data, contract, chain, fields, onReset, onSendToScanner }: Props) {
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);

    const sorted = useMemo(() => {
        let list = data.results;
        if (search.trim()) {
            list = list.filter(r => r.address.toLowerCase().includes(search.toLowerCase()));
        }
        if (fields === 'full') {
            list = [...list].sort((a, b) =>
                sortDir === 'desc'
                    ? (b.mint_count ?? 0) - (a.mint_count ?? 0)
                    : (a.mint_count ?? 0) - (b.mint_count ?? 0)
            );
        }
        return list;
    }, [data.results, sortDir, search, fields]);

    const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const totalPages = Math.ceil(sorted.length / PAGE_SIZE);

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="w-full flex flex-col gap-5"
        >
            {/* Summary card */}
            <div className="glass-card p-6 md:p-8">
                <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
                    <div>
                        <h2
                            className="text-lg font-bold"
                            style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-corge-offwhite)' }}
                        >
                            Minters Found
                        </h2>
                        <p
                            className="text-xs mt-0.5 font-mono"
                            style={{ color: 'rgba(242,242,242,0.35)' }}
                        >
                            {data.contract}
                        </p>
                    </div>
                    <button
                        onClick={onReset}
                        className="text-xs px-3 py-1.5 rounded-lg"
                        style={{
                            background: 'transparent',
                            border: '1px solid var(--glass-border)',
                            color: 'rgba(242,242,242,0.4)',
                            fontFamily: 'var(--font-body)',
                            cursor: 'pointer',
                        }}
                    >
                        New search
                    </button>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
                    {[
                        { label: 'Unique minters', value: data.total_minters.toLocaleString(), color: 'var(--color-corge-orange)' },
                        { label: 'Total mints', value: data.total_mints.toLocaleString(), color: 'var(--color-corge-offwhite)' },
                        { label: 'Chain ID', value: String(data.chain_id), color: 'rgba(242,242,242,0.5)' },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="rounded-xl px-3 py-3 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)' }}>
                            <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'rgba(242,242,242,0.4)', fontFamily: 'var(--font-body)' }}>{label}</p>
                            <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)', color }}>{value}</p>
                        </div>
                    ))}
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => onSendToScanner(data)}
                        className="flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all flex items-center justify-center gap-2"
                        style={{
                            background: 'var(--color-corge-orange)',
                            color: '#fff',
                            fontFamily: 'var(--font-body)',
                            border: 'none',
                            cursor: 'pointer',
                            minHeight: '44px',
                        }}
                    >
                        → Send to Collection Scanner
                    </button>
                    <button
                        onClick={() => window.open(getMintersCSVUrl(contract, chain, fields), '_blank')}
                        className="px-4 rounded-lg py-2.5 text-sm font-semibold transition-all"
                        style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid var(--glass-border)',
                            color: 'rgba(242,242,242,0.7)',
                            fontFamily: 'var(--font-body)',
                            cursor: 'pointer',
                            minHeight: '44px',
                        }}
                    >
                        ↓ CSV
                    </button>
                    <button
                        onClick={() => downloadJSON(data, fields)}
                        className="px-4 rounded-lg py-2.5 text-sm font-semibold transition-all"
                        style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid var(--glass-border)',
                            color: 'rgba(242,242,242,0.7)',
                            fontFamily: 'var(--font-body)',
                            cursor: 'pointer',
                            minHeight: '44px',
                        }}
                    >
                        ↓ JSON
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="glass-card p-4 md:p-6">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <p className="text-sm font-semibold" style={{ fontFamily: 'var(--font-body)', color: 'rgba(242,242,242,0.7)' }}>
                        {sorted.length.toLocaleString()} addresses
                    </p>
                    <input
                        type="text"
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(0); }}
                        placeholder="Search address..."
                        className="focus-orange rounded-lg px-3 py-1.5 text-xs outline-none"
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--glass-border)',
                            color: 'rgba(242,242,242,0.7)',
                            fontFamily: 'monospace',
                            width: '220px',
                        }}
                    />
                </div>

                <div className="overflow-x-auto scrollbar-corge">
                    <table className="w-full text-xs" style={{ fontFamily: 'var(--font-body)', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                <th className="text-left py-2 px-2" style={{ color: 'rgba(242,242,242,0.4)', fontWeight: 500 }}>#</th>
                                <th className="text-left py-2 px-2" style={{ color: 'rgba(242,242,242,0.4)', fontWeight: 500 }}>Address</th>
                                {fields === 'full' && (
                                    <th
                                        className="text-right py-2 px-2 cursor-pointer select-none"
                                        style={{ color: 'rgba(242,242,242,0.4)', fontWeight: 500 }}
                                        onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                                    >
                                        Mints {sortDir === 'desc' ? '↓' : '↑'}
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.map((r, i) => (
                                <tr
                                    key={r.address}
                                    style={{
                                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                                        background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                                    }}
                                >
                                    <td className="py-2 px-2" style={{ color: 'rgba(242,242,242,0.25)' }}>
                                        {page * PAGE_SIZE + i + 1}
                                    </td>
                                    <td className="py-2 px-2" style={{ color: 'rgba(242,242,242,0.7)', fontFamily: 'monospace' }}>
                                        <span className="hidden md:inline">{r.address}</span>
                                        <span className="md:hidden">{r.address.slice(0, 10)}...{r.address.slice(-6)}</span>
                                    </td>
                                    {fields === 'full' && (
                                        <td className="py-2 px-2 text-right font-bold" style={{ color: 'var(--color-corge-orange)' }}>
                                            {r.mint_count ?? '—'}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

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
                            {page + 1} / {totalPages} · {sorted.length.toLocaleString()} total
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


import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CollectionWalletResult, CollectionStats } from '../../types';
import CollectionResults from '../collection/CollectionResults';
import { useRescan } from '../../hooks/useRescan';
import { useFirstTxScan } from '../../hooks/useFirstTxScan';
import { useTransferCheck } from '../../hooks/useTransferCheck';

// ─── CSV parser ───────────────────────────────────────────────────────────────

const WALLET_REGEX = /^0x[a-fA-F0-9]{40}$/;

function parseCollectionCSV(raw: string): { results: CollectionWalletResult[]; errors: string[] } {
    const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) return { results: [], errors: ['File appears empty or has no data rows.'] };
    const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    function col(...names: string[]): number {
        for (const n of names) { const i = header.indexOf(n); if (i !== -1) return i; }
        return -1;
    }
    const iWallet = col('wallet', 'address', 'to_address', 'owner', 'addr', 'wallet_address');
    const iScore = col('wallet_score', 'score');
    const iLabel = col('label');
    const iSweeper = col('is_sweeper', 'sweeper');
    const iFlips = col('flip_count', 'flips', 'flip');
    const iConf = col('confidence', 'conf');
    const iNewWallet = col('is_new_wallet', 'new_wallet');
    if (iWallet === -1) return { results: [], errors: ['Could not find a wallet address column.'] };
    if (iScore === -1) return { results: [], errors: ['Could not find a score column.'] };
    const results: CollectionWalletResult[] = [];
    const errors: string[] = [];
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
        const wallet = cols[iWallet] ?? '';
        if (!wallet || !WALLET_REGEX.test(wallet)) {
            if (wallet.length > 0) errors.push(`Row ${i + 1}: invalid address "${wallet.slice(0, 12)}..."`);
            continue;
        }
        const score = parseFloat(cols[iScore] ?? '0');
        if (isNaN(score)) { errors.push(`Row ${i + 1}: invalid score`); continue; }
        const flips = parseInt(cols[iFlips] ?? '0', 10) || 0;
        const isNewWallet = iNewWallet !== -1
            ? (cols[iNewWallet] ?? '').toLowerCase() === 'true'
            : flips <= 2;
        results.push({
            wallet, wallet_score: score,
            label: cols[iLabel] ?? '',
            is_sweeper: (cols[iSweeper] ?? '').toLowerCase() === 'true',
            flip_count: flips,
            confidence: parseFloat(cols[iConf] ?? '0') || 0,
            is_new_wallet: isNewWallet,
        });
    }
    return { results, errors: errors.slice(0, 5) };
}

// ─── Stats builder ────────────────────────────────────────────────────────────

function computeStats(results: CollectionWalletResult[]): CollectionStats {
    if (results.length === 0) {
        return {
            total: 0, avg_score: 0, median_score: 0, min_score: 0, max_score: 0,
            sweepers: 0, new_wallets: 0, zero_flip_wallets: 0, label_distribution: {}, score_distribution: {}
        };
    }
    const scores = results.map(r => r.wallet_score).sort((a, b) => a - b);
    const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
    const mid = Math.floor(scores.length / 2);
    const median = scores.length % 2 === 0 ? (scores[mid - 1] + scores[mid]) / 2 : scores[mid];
    const labelDist: Record<string, number> = {};
    const scoreDist: Record<string, number> = { '0-2': 0, '2-4': 0, '4-6': 0, '6-8': 0, '8-10': 0 };
    let sweepers = 0, newWallets = 0, zeroFlip = 0;
    for (const r of results) {
        if (r.label) labelDist[r.label] = (labelDist[r.label] ?? 0) + 1;
        if (r.is_sweeper) sweepers++;
        if (r.is_new_wallet ?? r.flip_count <= 2) newWallets++;
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
        min_score: scores[0], max_score: scores[scores.length - 1],
        sweepers, new_wallets: newWallets, zero_flip_wallets: zeroFlip,
        label_distribution: labelDist, score_distribution: scoreDist,
    };
}

function mergeResults(base: CollectionWalletResult[], updates: CollectionWalletResult[]): CollectionWalletResult[] {
    const map = new Map<string, CollectionWalletResult>();
    for (const r of base) if (r?.wallet) map.set(r.wallet.toLowerCase(), r);
    for (const r of updates) if (r?.wallet) map.set(r.wallet.toLowerCase(), r);
    return Array.from(map.values());
}

function exportCSV(results: CollectionWalletResult[], name: string) {
    const header = 'wallet,wallet_score,label,is_sweeper,flip_count,confidence,is_new_wallet,first_tx_date,transferred,transferred_to,transferred_at,transfer_type';
    const rows = results.map(r =>
        `${r.wallet},${r.wallet_score.toFixed(2)},${r.label},${r.is_sweeper},${r.flip_count},${r.confidence},${r.is_new_wallet ?? false},${r.first_tx_date ?? ''},${r.transferred ?? ''},${r.transferred_to ?? ''},${r.transferred_at ?? ''},${r.transfer_type ?? ''}`
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${name}_updated.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedScan {
    filename: string;
    results: CollectionWalletResult[];
    stats: CollectionStats;
    parseErrors: string[];
}

type HistoryView = 'upload' | 'results' | 'rescan' | 'firsttx' | 'transfer';

// ─── Rescan page ──────────────────────────────────────────────────────────────

interface RescanPageProps {
    zeroAddresses: string[];
    collectionName: string;
    onMerge: (newResults: CollectionWalletResult[]) => void;
    onBack: () => void;
}

function RescanPage({ zeroAddresses, collectionName, onMerge, onBack }: RescanPageProps) {
    const { state, startRescan, reset } = useRescan();
    const [merged, setMerged] = useState(false);

    function handleMerge() {
        onMerge(state.newResults);
        setMerged(true);
    }

    return (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="w-full flex flex-col gap-5">
            <div className="flex items-center gap-3">
                <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'rgba(242,242,242,0.5)', fontFamily: 'var(--font-body)', cursor: 'pointer', fontSize: '0.875rem' }}>
                    ← Back
                </button>
                <div>
                    <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-corge-offwhite)' }}>
                        Rescan Zero-Score Wallets
                    </h2>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(242,242,242,0.4)', fontFamily: 'var(--font-body)' }}>
                        {zeroAddresses.length.toLocaleString()} wallets scored 0 — rescanning to get accurate results
                    </p>
                </div>
            </div>

            <div className="glass-card p-6 flex flex-col gap-5">
                {/* Idle */}
                {state.phase === 'idle' && (
                    <div className="flex flex-col items-center gap-4 py-4 text-center">
                        <span className="text-4xl">🔄</span>
                        <div>
                            <p className="text-sm font-semibold" style={{ color: 'var(--color-corge-offwhite)', fontFamily: 'var(--font-body)' }}>
                                Ready to rescan {zeroAddresses.length.toLocaleString()} wallets
                            </p>
                            <p className="text-xs mt-1" style={{ color: 'rgba(242,242,242,0.4)', fontFamily: 'var(--font-body)' }}>
                                These wallets returned a score of 0, which may indicate a failed lookup. Rescanning sends them back through the scoring pipeline.
                            </p>
                        </div>
                        <button
                            onClick={() => startRescan(zeroAddresses, collectionName)}
                            className="px-6 py-3 rounded-lg font-semibold text-sm"
                            style={{ background: 'var(--color-corge-orange)', color: '#fff', border: 'none', fontFamily: 'var(--font-body)', cursor: 'pointer', minHeight: '44px' }}
                        >
                            Start Rescan
                        </button>
                    </div>
                )}

                {/* Scanning */}
                {state.phase === 'scanning' && (
                    <div className="flex flex-col gap-4">
                        <div className="flex justify-between text-xs" style={{ fontFamily: 'var(--font-body)', color: 'rgba(242,242,242,0.5)' }}>
                            <span>Scanning… {state.completed.toLocaleString()} / {state.total.toLocaleString()}</span>
                            <span style={{ color: 'var(--color-corge-orange)' }}>{state.percent}%</span>
                        </div>
                        <div className="w-full rounded-full overflow-hidden" style={{ height: '6px', background: 'rgba(255,255,255,0.08)' }}>
                            <motion.div className="h-full rounded-full" style={{ background: 'var(--color-corge-orange)' }}
                                animate={{ width: `${state.percent}%` }} transition={{ duration: 0.5 }} />
                        </div>
                        <div className="flex items-center gap-2">
                            <motion.div className="w-2 h-2 rounded-full" style={{ background: 'var(--color-corge-orange)' }}
                                animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
                            <p className="text-xs" style={{ color: 'rgba(242,242,242,0.4)', fontFamily: 'var(--font-body)' }}>Live — updating every 5 seconds</p>
                        </div>
                    </div>
                )}

                {/* Done */}
                {state.phase === 'done' && !merged && (
                    <div className="flex flex-col gap-4">
                        <div className="flex justify-between text-xs" style={{ fontFamily: 'var(--font-body)', color: 'rgba(242,242,242,0.5)' }}>
                            <span style={{ color: '#34d399' }}>✓ {state.newResults.length.toLocaleString()} wallets rescanned</span>
                            <span style={{ color: '#34d399' }}>100%</span>
                        </div>
                        <div className="w-full rounded-full overflow-hidden" style={{ height: '6px', background: 'rgba(255,255,255,0.08)' }}>
                            <div className="h-full rounded-full" style={{ background: '#34d399', width: '100%' }} />
                        </div>
                        <div className="flex gap-3 flex-wrap">
                            <button onClick={handleMerge} className="px-5 py-2.5 rounded-lg font-semibold text-sm"
                                style={{ background: '#34d399', color: '#0a0a0a', border: 'none', fontFamily: 'var(--font-body)', cursor: 'pointer', minHeight: '44px' }}>
                                ✓ Merge results & go back
                            </button>
                            <button onClick={() => { reset(); }} className="px-4 py-2.5 rounded-lg text-sm"
                                style={{ background: 'transparent', border: '1px solid var(--glass-border)', color: 'rgba(242,242,242,0.5)', fontFamily: 'var(--font-body)', cursor: 'pointer' }}>
                                Rescan again
                            </button>
                        </div>
                    </div>
                )}

                {merged && (
                    <div className="text-center py-4">
                        <p className="text-sm" style={{ color: '#34d399', fontFamily: 'var(--font-body)' }}>✓ Results merged. Go back to view the updated dataset.</p>
                    </div>
                )}

                {state.phase === 'error' && (
                    <div className="flex flex-col gap-3">
                        <p className="text-sm" style={{ color: '#f87171', fontFamily: 'var(--font-body)' }}>{state.error}</p>
                        <button onClick={() => { reset(); startRescan(zeroAddresses, collectionName); }}
                            className="text-xs px-4 py-2 rounded-lg w-fit"
                            style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', fontFamily: 'var(--font-body)', cursor: 'pointer' }}>
                            Retry
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

// ─── First TX page ────────────────────────────────────────────────────────────

interface FirstTxPageProps {
    jeetZeroAddresses: string[];
    onAppend: (map: Map<string, string | null>) => void;
    onBack: () => void;
}

function FirstTxPage({ jeetZeroAddresses, onAppend, onBack }: FirstTxPageProps) {
    const { state, startScan, reset } = useFirstTxScan();
    const [appended, setAppended] = useState(false);

    function handleAppend() {
        const map = new Map<string, string | null>();
        for (const r of state.results) if (r?.wallet) map.set(r.wallet.toLowerCase(), r.first_tx_date);
        onAppend(map);
        setAppended(true);
    }

    return (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="w-full flex flex-col gap-5">
            <div className="flex items-center gap-3">
                <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'rgba(242,242,242,0.5)', fontFamily: 'var(--font-body)', cursor: 'pointer', fontSize: '0.875rem' }}>
                    ← Back
                </button>
                <div>
                    <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-corge-offwhite)' }}>
                        Add First Transaction Dates
                    </h2>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(242,242,242,0.4)', fontFamily: 'var(--font-body)' }}>
                        {jeetZeroAddresses.length.toLocaleString()} Jeet wallets with 0 flips — fetching their first on-chain TX date
                    </p>
                </div>
            </div>

            <div className="glass-card p-6 flex flex-col gap-5">
                {/* Explanation */}
                <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(0,217,255,0.06)', border: '1px solid rgba(0,217,255,0.2)' }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: '#00D9FF', fontFamily: 'var(--font-body)' }}>Why only Jeet + 0 flips?</p>
                    <p className="text-xs" style={{ color: 'rgba(242,242,242,0.5)', fontFamily: 'var(--font-body)' }}>
                        Wallets with flip history already have trading data — their age is less relevant. Jeet wallets with 0 flips are ambiguous: are they genuinely new wallets, or just wallets that never traded NFTs? The first TX date answers that without wasting API calls on wallets that already have context.
                    </p>
                </div>

                {/* Idle */}
                {state.phase === 'idle' && (
                    <div className="flex flex-col items-center gap-4 py-4 text-center">
                        <span className="text-4xl">📅</span>
                        <div>
                            <p className="text-sm font-semibold" style={{ color: 'var(--color-corge-offwhite)', fontFamily: 'var(--font-body)' }}>
                                Ready to fetch {jeetZeroAddresses.length.toLocaleString()} first TX dates
                            </p>
                            <p className="text-xs mt-1" style={{ color: 'rgba(242,242,242,0.4)', fontFamily: 'var(--font-body)' }}>
                                Results will be appended as a new column in your dataset and export.
                            </p>
                        </div>
                        <button onClick={() => startScan(jeetZeroAddresses)}
                            className="px-6 py-3 rounded-lg font-semibold text-sm"
                            style={{ background: 'rgba(0,217,255,0.15)', color: '#00D9FF', border: '1px solid rgba(0,217,255,0.3)', fontFamily: 'var(--font-body)', cursor: 'pointer', minHeight: '44px' }}>
                            Fetch First TX Dates
                        </button>
                    </div>
                )}

                {/* Scanning */}
                {state.phase === 'scanning' && (
                    <div className="flex flex-col gap-4">
                        <div className="flex justify-between text-xs" style={{ fontFamily: 'var(--font-body)', color: 'rgba(242,242,242,0.5)' }}>
                            <span>Fetching… {state.completed.toLocaleString()} / {state.total.toLocaleString()}</span>
                            <span style={{ color: '#00D9FF' }}>{state.percent}%</span>
                        </div>
                        <div className="w-full rounded-full overflow-hidden" style={{ height: '6px', background: 'rgba(255,255,255,0.08)' }}>
                            <motion.div className="h-full rounded-full" style={{ background: '#00D9FF' }}
                                animate={{ width: `${state.percent}%` }} transition={{ duration: 0.4 }} />
                        </div>
                        <div className="flex items-center gap-2">
                            <motion.div className="w-2 h-2 rounded-full" style={{ background: '#00D9FF' }}
                                animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
                            <p className="text-xs" style={{ color: 'rgba(242,242,242,0.4)', fontFamily: 'var(--font-body)' }}>Polling every 3 seconds</p>
                        </div>
                    </div>
                )}

                {/* Done */}
                {state.phase === 'done' && !appended && (
                    <div className="flex flex-col gap-4">
                        <div className="flex justify-between text-xs" style={{ fontFamily: 'var(--font-body)' }}>
                            <span style={{ color: '#34d399' }}>✓ {state.results.length.toLocaleString()} dates fetched</span>
                            <span style={{ color: '#34d399' }}>100%</span>
                        </div>
                        <div className="w-full rounded-full overflow-hidden" style={{ height: '6px', background: 'rgba(255,255,255,0.08)' }}>
                            <div className="h-full rounded-full" style={{ background: '#34d399', width: '100%' }} />
                        </div>
                        <div className="flex gap-3 flex-wrap">
                            <button onClick={handleAppend} className="px-5 py-2.5 rounded-lg font-semibold text-sm"
                                style={{ background: '#34d399', color: '#0a0a0a', border: 'none', fontFamily: 'var(--font-body)', cursor: 'pointer', minHeight: '44px' }}>
                                ✓ Append dates & go back
                            </button>
                            <button onClick={() => { reset(); }} className="px-4 py-2.5 rounded-lg text-sm"
                                style={{ background: 'transparent', border: '1px solid var(--glass-border)', color: 'rgba(242,242,242,0.5)', fontFamily: 'var(--font-body)', cursor: 'pointer' }}>
                                Fetch again
                            </button>
                        </div>
                    </div>
                )}

                {appended && (
                    <div className="text-center py-4">
                        <p className="text-sm" style={{ color: '#34d399', fontFamily: 'var(--font-body)' }}>✓ Dates appended. Go back to view the updated dataset.</p>
                    </div>
                )}

                {state.phase === 'error' && (
                    <div className="flex flex-col gap-3">
                        <p className="text-sm" style={{ color: '#f87171', fontFamily: 'var(--font-body)' }}>{state.error}</p>
                        <button onClick={() => { reset(); startScan(jeetZeroAddresses); }}
                            className="text-xs px-4 py-2 rounded-lg w-fit"
                            style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', fontFamily: 'var(--font-body)', cursor: 'pointer' }}>
                            Retry
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

// ─── Transfer check page ──────────────────────────────────────────────────────

interface TransferPageProps {
    addresses: string[];
    onAppend: (results: Map<string, { transferred: boolean; to: string | null; transferred_at: string | null; token_id: string | null; tx_hash: string | null; type?: string | null }>) => void;
    onBack: () => void;
}

function TransferPage({ addresses, onAppend, onBack }: TransferPageProps) {
    const { state, startCheck, reset } = useTransferCheck();
    const [contract, setContract] = useState('');
    const [contractError, setContractError] = useState('');
    const [appended, setAppended] = useState(false);

    const WALLET_RE = /^0x[a-fA-F0-9]{40}$/;

    function handleStart() {
        if (!WALLET_RE.test(contract.trim())) {
            setContractError('Enter a valid contract address (0x...)');
            return;
        }
        setContractError('');
        startCheck(contract.trim(), addresses);
    }

    function handleAppend() {
        const map = new Map<string, { transferred: boolean; to: string | null; transferred_at: string | null; token_id: string | null; tx_hash: string | null; type?: string | null }>();
        for (const r of state.results) {
            if (r?.address) {
                map.set(r.address.toLowerCase(), {
                    transferred: r.transferred,
                    to: r.to,
                    transferred_at: r.transferred_at,
                    token_id: r.token_id,
                    tx_hash: r.tx_hash,
                    type: r.type ?? null,
                });
            }
        }
        onAppend(map);
        setAppended(true);
    }

    return (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="w-full flex flex-col gap-5">
            <div className="flex items-center gap-3">
                <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'rgba(242,242,242,0.5)', fontFamily: 'var(--font-body)', cursor: 'pointer', fontSize: '0.875rem' }}>
                    ← Back
                </button>
                <div>
                    <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-corge-offwhite)' }}>
                        Check Transfer Status
                    </h2>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(242,242,242,0.4)', fontFamily: 'var(--font-body)' }}>
                        {addresses.length.toLocaleString()} Jeet + Paper Hands wallets — checking if they transferred their NFT
                    </p>
                </div>
            </div>

            <div className="glass-card p-6 flex flex-col gap-5">
                {/* Explanation */}
                <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,0,107,0.06)', border: '1px solid rgba(255,0,107,0.2)' }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: '#FF006B', fontFamily: 'var(--font-body)' }}>Why Jeet + Paper Hands?</p>
                    <p className="text-xs" style={{ color: 'rgba(242,242,242,0.5)', fontFamily: 'var(--font-body)' }}>
                        These are the wallets most likely to have sold or transferred their NFT. Burns are excluded — only real wallet-to-wallet transfers count. Results are cached 2hr per wallet+contract pair.
                    </p>
                </div>

                {/* Contract input */}
                {state.phase === 'idle' && (
                    <div className="flex flex-col gap-3">
                        <div>
                            <label className="block text-xs uppercase tracking-widest mb-1.5" style={{ color: 'rgba(242,242,242,0.4)', fontFamily: 'var(--font-body)' }}>
                                NFT Contract Address
                            </label>
                            <input
                                type="text"
                                value={contract}
                                onChange={e => { setContract(e.target.value); setContractError(''); }}
                                placeholder="0x..."
                                className="focus-orange w-full rounded-lg px-4 py-3 text-sm outline-none"
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: `1px solid ${contractError ? 'var(--color-error-border)' : 'var(--glass-border)'}`,
                                    color: 'var(--color-corge-offwhite)',
                                    fontFamily: 'monospace',
                                    minHeight: '44px',
                                }}
                            />
                            {contractError && <p className="text-xs mt-1" style={{ color: 'var(--color-error)', fontFamily: 'var(--font-body)' }}>{contractError}</p>}
                        </div>
                        <button onClick={handleStart}
                            className="px-6 py-3 rounded-lg font-semibold text-sm w-fit"
                            style={{ background: '#FF006B', color: '#fff', border: 'none', fontFamily: 'var(--font-body)', cursor: 'pointer', minHeight: '44px' }}>
                            Check {addresses.length.toLocaleString()} wallets
                        </button>
                    </div>
                )}

                {/* Loading — submitted, waiting for first poll */}
                {state.phase === 'loading' && (
                    <div className="flex flex-col items-center gap-4 py-6">
                        <span className="inline-block w-10 h-10 rounded-full border-2 border-white/10 animate-spin" style={{ borderTopColor: '#FF006B' }} />
                        <p className="text-sm font-semibold" style={{ color: 'var(--color-corge-offwhite)', fontFamily: 'var(--font-body)' }}>
                            Submitting {state.total.toLocaleString()} wallets...
                        </p>
                    </div>
                )}

                {/* Scanning — polling in progress */}
                {state.phase === 'scanning' && (
                    <div className="flex flex-col gap-4">
                        <div className="flex justify-between text-xs" style={{ fontFamily: 'var(--font-body)', color: 'rgba(242,242,242,0.5)' }}>
                            <span>Checking… {state.completed.toLocaleString()} / {state.total.toLocaleString()}</span>
                            <span style={{ color: '#FF006B' }}>{state.percent}%</span>
                        </div>
                        <div className="w-full rounded-full overflow-hidden" style={{ height: '6px', background: 'rgba(255,255,255,0.08)' }}>
                            <motion.div className="h-full rounded-full" style={{ background: '#FF006B' }}
                                animate={{ width: `${state.percent}%` }} transition={{ duration: 0.5 }} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-xl px-3 py-2 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)' }}>
                                <p className="text-xs" style={{ color: 'rgba(242,242,242,0.4)', fontFamily: 'var(--font-body)' }}>Transferred so far</p>
                                <p className="text-lg font-bold" style={{ fontFamily: 'var(--font-heading)', color: '#f87171' }}>{state.transferred}</p>
                            </div>
                            <div className="rounded-xl px-3 py-2 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)' }}>
                                <p className="text-xs" style={{ color: 'rgba(242,242,242,0.4)', fontFamily: 'var(--font-body)' }}>Sales so far</p>
                                <p className="text-lg font-bold" style={{ fontFamily: 'var(--font-heading)', color: '#fbbf24' }}>{state.sales}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <motion.div className="w-2 h-2 rounded-full" style={{ background: '#FF006B' }}
                                animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
                            <p className="text-xs" style={{ color: 'rgba(242,242,242,0.4)', fontFamily: 'var(--font-body)' }}>Polling every 5 seconds</p>
                        </div>
                    </div>
                )}

                {/* Done */}
                {state.phase === 'done' && !appended && (
                    <div className="flex flex-col gap-4">
                        {/* Summary */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                                { label: 'Total checked', value: state.total.toLocaleString(), color: 'var(--color-corge-offwhite)' },
                                { label: 'Transferred', value: state.transferred.toLocaleString(), color: '#f87171' },
                                { label: 'Sales', value: (state.sales ?? 0).toLocaleString(), color: '#fbbf24' },
                                { label: 'Still holding', value: state.not_transferred.toLocaleString(), color: '#34d399' },
                            ].map(({ label, value, color }) => (
                                <div key={label} className="rounded-xl px-3 py-3 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)' }}>
                                    <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'rgba(242,242,242,0.4)', fontFamily: 'var(--font-body)' }}>{label}</p>
                                    <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)', color }}>{value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Transferred wallets preview */}
                        {state.transferred > 0 && (
                            <div>
                                <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'rgba(242,242,242,0.4)', fontFamily: 'var(--font-body)' }}>
                                    Transferred wallets
                                </p>
                                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto scrollbar-corge">
                                    {state.results.filter(r => r.transferred).map(r => (
                                        <div key={r.address} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-xs"
                                            style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)', fontFamily: 'var(--font-body)' }}>
                                            <span style={{ color: 'rgba(242,242,242,0.5)', fontFamily: 'monospace' }}>
                                                {r.address.slice(0, 8)}...{r.address.slice(-4)}
                                            </span>
                                            <span style={{ color: 'rgba(242,242,242,0.3)' }}>→</span>
                                            <span style={{ color: '#f87171', fontFamily: 'monospace' }}>
                                                {r.to ? `${r.to.slice(0, 8)}...${r.to.slice(-4)}` : '—'}
                                            </span>
                                            {r.type && (
                                                <span className="px-1.5 py-0.5 rounded text-xs font-semibold" style={{
                                                    background: r.type === 'sale' ? 'rgba(251,191,36,0.15)' : 'rgba(96,165,250,0.15)',
                                                    color: r.type === 'sale' ? '#fbbf24' : r.type === 'transfer' ? '#60a5fa' : '#a3a3a3',
                                                    border: `1px solid ${r.type === 'sale' ? 'rgba(251,191,36,0.3)' : 'rgba(96,165,250,0.3)'}`,
                                                }}>
                                                    {r.type}
                                                </span>
                                            )}
                                            {r.transferred_at && (
                                                <span style={{ color: 'rgba(242,242,242,0.3)' }}>
                                                    {new Date(r.transferred_at).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3 flex-wrap">
                            <button onClick={handleAppend}
                                className="px-5 py-2.5 rounded-lg font-semibold text-sm"
                                style={{ background: '#34d399', color: '#0a0a0a', border: 'none', fontFamily: 'var(--font-body)', cursor: 'pointer', minHeight: '44px' }}>
                                ✓ Append transfer data & go back
                            </button>
                            <button onClick={() => { reset(); }}
                                className="px-4 py-2.5 rounded-lg text-sm"
                                style={{ background: 'transparent', border: '1px solid var(--glass-border)', color: 'rgba(242,242,242,0.5)', fontFamily: 'var(--font-body)', cursor: 'pointer' }}>
                                Check again
                            </button>
                        </div>
                    </div>
                )}

                {appended && (
                    <div className="text-center py-4">
                        <p className="text-sm" style={{ color: '#34d399', fontFamily: 'var(--font-body)' }}>✓ Transfer data appended. Go back to view the updated dataset.</p>
                    </div>
                )}

                {state.phase === 'error' && (
                    <div className="flex flex-col gap-3">
                        <p className="text-sm" style={{ color: '#f87171', fontFamily: 'var(--font-body)' }}>{state.error}</p>
                        <button onClick={() => reset()}
                            className="text-xs px-4 py-2 rounded-lg w-fit"
                            style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', fontFamily: 'var(--font-body)', cursor: 'pointer' }}>
                            Try again
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ScanHistory() {
    const [view, setView] = useState<HistoryView>('upload');
    const [scan, setScan] = useState<ParsedScan | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    function processFile(file: File) {
        if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
            setError('Please upload a .csv or .txt file.');
            return;
        }
        setLoading(true);
        setError(null);
        const reader = new FileReader();
        reader.onload = e => {
            const raw = e.target?.result as string ?? '';
            const { results, errors } = parseCollectionCSV(raw);
            setLoading(false);
            if (results.length === 0) {
                setError(errors[0] ?? 'No valid wallet rows found in this file.');
                return;
            }
            const stats = computeStats(results);
            setScan({ filename: file.name, results, stats, parseErrors: errors });
            setView('results');
        };
        reader.onerror = () => { setLoading(false); setError('Failed to read file.'); };
        reader.readAsText(file);
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    }

    function handleReset() {
        setScan(null);
        setView('upload');
        setError(null);
        if (fileRef.current) fileRef.current.value = '';
    }

    function handleMergeRescan(newResults: CollectionWalletResult[]) {
        if (!scan) return;
        const merged = mergeResults(scan.results, newResults);
        setScan(prev => prev ? { ...prev, results: merged, stats: computeStats(merged) } : null);
    }

    function handleAppendFirstTx(map: Map<string, string | null>) {
        if (!scan) return;
        const updated = scan.results.map(r => {
            const key = r.wallet?.toLowerCase();
            const fetched = key ? map.get(key) : undefined;
            return {
                ...r,
                first_tx_date: fetched !== undefined ? fetched : (r.first_tx_date ?? null),
            };
        });
        setScan(prev => prev ? { ...prev, results: updated, stats: computeStats(updated) } : null);
    }

    function handleAppendTransfer(map: Map<string, { transferred: boolean; to: string | null; transferred_at: string | null; token_id: string | null; tx_hash: string | null; type?: string | null }>) {
        if (!scan) return;
        const updated = scan.results.map(r => {
            const key = r.wallet?.toLowerCase();
            const data = key ? map.get(key) : undefined;
            if (data === undefined) return r;
            return {
                ...r,
                transferred: data.transferred,
                transferred_to: data.to,
                transferred_at: data.transferred_at,
                token_id: data.token_id,
                tx_hash: data.tx_hash,
                transfer_type: (data.type ?? null) as 'sale' | 'transfer' | 'unknown' | null,
            };
        });
        setScan(prev => prev ? { ...prev, results: updated, stats: computeStats(updated) } : null);
    }

    const collectionName = scan?.filename
        .replace(/\.(csv|txt)$/i, '')
        .replace(/^collection_scores_/i, '')
        .replace(/_0x[a-fA-F0-9]{40}$/i, '') ?? '';

    const zeroAddresses = scan?.results.filter(r => r.wallet_score === 0).map(r => r.wallet) ?? [];
    const jeetZeroAddresses = scan?.results.filter(r => r.label === 'Jeet' && r.flip_count === 0).map(r => r.wallet) ?? [];
    // Jeet + Paper Hands for transfer check (capped at 2000 per backend limit)
    const transferAddresses = (scan?.results.filter(r => r.label === 'Jeet' || r.label === 'Paper Hands').map(r => r.wallet) ?? []).slice(0, 2000);

    return (
        <AnimatePresence mode="wait">

            {/* ── Upload view ── */}
            {view === 'upload' && (
                <motion.div key="upload" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="w-full flex flex-col gap-5">
                    <div>
                        <h2 className="text-xl font-bold mb-1" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-corge-offwhite)' }}>
                            Visualize a Scan
                        </h2>
                        <p className="text-sm" style={{ color: 'rgba(242,242,242,0.5)', fontFamily: 'var(--font-body)' }}>
                            Upload a collection scores CSV to explore stats, charts, and the full wallet table.
                        </p>
                    </div>
                    <div
                        className="glass-card flex flex-col items-center justify-center gap-4 cursor-pointer transition-all"
                        style={{ minHeight: '220px', border: `2px dashed ${dragOver ? 'var(--color-corge-orange)' : 'var(--glass-border)'}`, background: dragOver ? 'rgba(255,90,31,0.05)' : 'rgba(255,255,255,0.02)', padding: '2.5rem' }}
                        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => fileRef.current?.click()}
                    >
                        {loading ? (
                            <span className="inline-block w-8 h-8 rounded-full border-2 border-white/20 border-t-orange-500 animate-spin" />
                        ) : (
                            <>
                                <span className="text-4xl">📊</span>
                                <div className="text-center">
                                    <p className="text-sm font-semibold" style={{ color: 'rgba(242,242,242,0.7)', fontFamily: 'var(--font-body)' }}>
                                        Drag & drop or <span style={{ color: 'var(--color-corge-orange)' }}>click to browse</span>
                                    </p>
                                    <p className="text-xs mt-1" style={{ color: 'rgba(242,242,242,0.3)', fontFamily: 'var(--font-body)' }}>
                                        Accepts .csv exported from the Collection Scanner
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                    <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }} />
                    {error && <p className="text-xs" style={{ color: 'var(--color-error)', fontFamily: 'var(--font-body)' }}>{error}</p>}
                    <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}>
                        <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(242,242,242,0.5)', fontFamily: 'var(--font-body)' }}>Expected CSV format</p>
                        <code className="text-xs block" style={{ color: 'rgba(242,242,242,0.35)', fontFamily: 'monospace', lineHeight: 1.7 }}>
                            wallet,wallet_score,label,is_sweeper,flip_count,confidence<br />
                            0xabc...,7.2,Solid,false,12,0.91
                        </code>
                    </div>
                </motion.div>
            )}

            {/* ── Results view ── */}
            {view === 'results' && scan && (
                <motion.div key="results" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="w-full flex flex-col gap-5">
                    {/* Header */}
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="min-w-0 flex-1">
                            <p className="text-lg font-bold truncate" title={scan.filename}
                                style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-corge-offwhite)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {scan.filename}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: 'rgba(242,242,242,0.4)', fontFamily: 'var(--font-body)' }}>
                                {scan.results.length.toLocaleString()} wallets · avg {scan.stats.avg_score.toFixed(2)}
                            </p>
                        </div>
                        <div className="flex gap-2 shrink-0 flex-wrap">
                            {/* Action buttons */}
                            {zeroAddresses.length > 0 && (
                                <button onClick={() => setView('rescan')}
                                    className="text-xs px-3 py-2 rounded-lg flex items-center gap-1.5"
                                    style={{ background: 'rgba(255,90,31,0.12)', border: '1px solid rgba(255,90,31,0.3)', color: 'var(--color-corge-orange)', fontFamily: 'var(--font-body)', cursor: 'pointer' }}>
                                    🔄 Rescan {zeroAddresses.length.toLocaleString()} zero-score
                                </button>
                            )}
                            {jeetZeroAddresses.length > 0 && (
                                <button onClick={() => setView('firsttx')}
                                    className="text-xs px-3 py-2 rounded-lg flex items-center gap-1.5"
                                    style={{ background: 'rgba(0,217,255,0.08)', border: '1px solid rgba(0,217,255,0.25)', color: '#00D9FF', fontFamily: 'var(--font-body)', cursor: 'pointer' }}>
                                    📅 Add first TX dates ({jeetZeroAddresses.length.toLocaleString()})
                                </button>
                            )}
                            {transferAddresses.length > 0 && (
                                <button onClick={() => setView('transfer')}
                                    className="text-xs px-3 py-2 rounded-lg flex items-center gap-1.5"
                                    style={{ background: 'rgba(255,0,107,0.08)', border: '1px solid rgba(255,0,107,0.25)', color: '#FF006B', fontFamily: 'var(--font-body)', cursor: 'pointer' }}>
                                    🔀 Check transfers ({transferAddresses.length.toLocaleString()})
                                </button>
                            )}
                            <button onClick={() => exportCSV(scan.results, collectionName)}
                                className="text-xs px-3 py-2 rounded-lg"
                                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)', color: 'rgba(242,242,242,0.6)', fontFamily: 'var(--font-body)', cursor: 'pointer' }}>
                                ↓ Export CSV
                            </button>
                            <button onClick={handleReset}
                                className="text-xs px-3 py-2 rounded-lg"
                                style={{ background: 'transparent', border: '1px solid var(--glass-border)', color: 'rgba(242,242,242,0.4)', fontFamily: 'var(--font-body)', cursor: 'pointer' }}>
                                ← Upload another
                            </button>
                        </div>
                    </div>
                    {/* Parse warnings */}
                    {scan.parseErrors.length > 0 && (
                        <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.25)' }}>
                            <p className="text-xs font-semibold mb-1" style={{ color: '#fbbf24', fontFamily: 'var(--font-body)' }}>
                                ⚠ {scan.parseErrors.length} row{scan.parseErrors.length !== 1 ? 's' : ''} skipped
                            </p>
                            {scan.parseErrors.map((e, i) => (
                                <p key={i} className="text-xs" style={{ color: 'rgba(242,242,242,0.45)', fontFamily: 'var(--font-body)' }}>{e}</p>
                            ))}
                        </div>
                    )}
                    <CollectionResults
                        results={scan.results}
                        stats={scan.stats}
                        collectionName={collectionName}
                        onReset={handleReset}
                    />
                </motion.div>
            )}

            {/* ── Rescan page ── */}
            {view === 'rescan' && scan && (
                <RescanPage key="rescan"
                    zeroAddresses={zeroAddresses}
                    collectionName={collectionName}
                    onMerge={(newResults) => { handleMergeRescan(newResults); setView('results'); }}
                    onBack={() => setView('results')}
                />
            )}

            {/* ── First TX page ── */}
            {view === 'firsttx' && scan && (
                <FirstTxPage key="firsttx"
                    jeetZeroAddresses={jeetZeroAddresses}
                    onAppend={(map) => { handleAppendFirstTx(map); setView('results'); }}
                    onBack={() => setView('results')}
                />
            )}

            {/* ── Transfer check page ── */}
            {view === 'transfer' && scan && (
                <TransferPage key="transfer"
                    addresses={transferAddresses}
                    onAppend={(map) => { handleAppendTransfer(map); setView('results'); }}
                    onBack={() => setView('results')}
                />
            )}

        </AnimatePresence>
    );
}

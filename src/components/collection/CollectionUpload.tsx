import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import type { CollectionWalletResult } from '../../types';

const WALLET_REGEX = /^0x[a-fA-F0-9]{40}$/;
const MAX_ADDRESSES = 4000;

interface Props {
    onStartFromFile: (file: File, collectionName: string, partialResults?: CollectionWalletResult[]) => void;
    onStartFromAddresses: (body: Record<string, unknown>, collectionName: string, partialResults?: CollectionWalletResult[]) => void;
    isLoading: boolean;
}

function parseAddresses(raw: string): string[] {
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return [];

    // Detect if this looks like a CSV with a header row
    const firstLine = lines[0].toLowerCase();
    const hasHeader = firstLine.includes('wallet') || firstLine.includes('address');

    const addresses: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Skip header row
        if (i === 0 && hasHeader) continue;

        // Split on comma or tab, take first column, strip quotes
        const firstCol = line.split(/[,\t]/)[0].trim().replace(/^["']|["']$/g, '');

        if (WALLET_REGEX.test(firstCol)) {
            addresses.push(firstCol);
        }
    }

    // Fallback: if nothing found via CSV parsing, try treating each token as a potential address
    // (handles plain newline-separated or space-separated lists)
    if (addresses.length === 0) {
        return raw
            .split(/[\s,;\t]+/)
            .map(s => s.trim().replace(/^["']|["']$/g, ''))
            .filter(s => WALLET_REGEX.test(s));
    }

    return addresses;
}

/** Parse a partial-results CSV exported by this app into CollectionWalletResult[] */
function parsePartialCSV(raw: string): CollectionWalletResult[] {
    const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) return [];
    // Expected header: wallet,wallet_score,label,is_sweeper,flip_count,confidence
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const idx = {
        wallet: header.indexOf('wallet'),
        wallet_score: header.indexOf('wallet_score'),
        label: header.indexOf('label'),
        is_sweeper: header.indexOf('is_sweeper'),
        flip_count: header.indexOf('flip_count'),
        confidence: header.indexOf('confidence'),
    };
    if (idx.wallet === -1 || idx.wallet_score === -1) return []; // not our format
    const results: CollectionWalletResult[] = [];
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        const wallet = cols[idx.wallet]?.trim();
        if (!wallet || !WALLET_REGEX.test(wallet)) continue;
        results.push({
            wallet,
            wallet_score: parseFloat(cols[idx.wallet_score] ?? '0') || 0,
            label: cols[idx.label]?.trim() ?? '',
            is_sweeper: cols[idx.is_sweeper]?.trim().toLowerCase() === 'true',
            flip_count: parseInt(cols[idx.flip_count] ?? '0', 10) || 0,
            confidence: parseFloat(cols[idx.confidence] ?? '0') || 0,
        });
    }
    return results;
}

/** Read a File as text */
function readFileText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target?.result as string ?? '');
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

export default function CollectionUpload({ onStartFromFile, onStartFromAddresses, isLoading }: Props) {
    const [collectionName, setCollectionName] = useState('');
    const [text, setText] = useState('');
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [partialFile, setPartialFile] = useState<File | null>(null);
    const [partialError, setPartialError] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);
    const partialRef = useRef<HTMLInputElement>(null);

    // Derived counts for paste mode — parse once, count valid vs non-address lines
    const valid = parseAddresses(text);
    const dataLines = text.trim().length === 0 ? 0 : (() => {
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length === 0) return 0;
        const firstLine = lines[0].toLowerCase();
        const hasHeader = firstLine.includes('wallet') || firstLine.includes('address');
        // Count lines that are not the header and not empty
        return lines.filter((l, i) => !(i === 0 && hasHeader)).length;
    })();
    const invalid = Math.max(0, dataLines - valid.length);

    function handleFileSelected(file: File) {
        setPendingFile(file);
        setText(''); // clear textarea when file is chosen
        setError(null);
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelected(file);
    }

    function clearFile() {
        setPendingFile(null);
        if (fileRef.current) fileRef.current.value = '';
    }

    function clearPartial() {
        setPartialFile(null);
        setPartialError(null);
        if (partialRef.current) partialRef.current.value = '';
    }

    async function handleSubmit() {
        setError(null);
        setPartialError(null);

        // Parse partial results if provided
        let partialResults: CollectionWalletResult[] | undefined;
        if (partialFile) {
            try {
                const raw = await readFileText(partialFile);
                const parsed = parsePartialCSV(raw);
                if (parsed.length === 0) {
                    setPartialError('Could not read partial results — make sure it\'s a CSV exported from this app.');
                    return;
                }
                partialResults = parsed;
            } catch {
                setPartialError('Failed to read partial results file.');
                return;
            }
        }

        if (pendingFile) {
            onStartFromFile(pendingFile, collectionName.trim(), partialResults);
            return;
        }

        // Paste mode — validate and send as JSON
        if (valid.length === 0) {
            setError('No valid Ethereum addresses found.');
            return;
        }
        if (valid.length > MAX_ADDRESSES) {
            setError(`Maximum ${MAX_ADDRESSES} addresses allowed. You have ${valid.length}.`);
            return;
        }

        // Subtract already-scored addresses
        const alreadyScored = new Set((partialResults ?? []).map(r => r.wallet.toLowerCase()));
        const remaining = valid.filter(a => !alreadyScored.has(a.toLowerCase()));

        if (remaining.length === 0) {
            setError('All addresses in this list are already in your partial results — nothing left to scan.');
            return;
        }

        onStartFromAddresses({ addresses: remaining }, collectionName.trim(), partialResults);
    }

    const canSubmit = !isLoading && (pendingFile !== null || valid.length > 0);

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="glass-card w-full p-6 md:p-8 flex flex-col gap-5"
        >
            <div>
                <h2
                    className="text-xl font-bold mb-1"
                    style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-corge-offwhite)' }}
                >
                    Collection Scanner
                </h2>
                <p className="text-sm" style={{ color: 'rgba(242,242,242,0.5)', fontFamily: 'var(--font-body)' }}>
                    Score up to 4,000 wallets. Upload a CSV/TXT file or paste addresses below.
                </p>
            </div>

            {/* Collection name */}
            <div>
                <label
                    className="block text-xs uppercase tracking-widest mb-1.5"
                    style={{ color: 'rgba(242,242,242,0.4)', fontFamily: 'var(--font-body)' }}
                >
                    Collection name <span style={{ color: 'rgba(242,242,242,0.25)' }}>(optional)</span>
                </label>
                <input
                    type="text"
                    value={collectionName}
                    onChange={e => setCollectionName(e.target.value)}
                    placeholder="e.g. Bored Apes"
                    disabled={isLoading}
                    className="focus-orange w-full rounded-lg px-4 py-2.5 text-sm outline-none"
                    style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--color-corge-offwhite)',
                        fontFamily: 'var(--font-body)',
                    }}
                />
            </div>

            {/* File upload zone */}
            <div>
                <label
                    className="block text-xs uppercase tracking-widest mb-1.5"
                    style={{ color: 'rgba(242,242,242,0.4)', fontFamily: 'var(--font-body)' }}
                >
                    Upload file <span style={{ color: 'rgba(242,242,242,0.25)' }}>.csv or .txt</span>
                </label>
                <div
                    className="relative rounded-xl transition-all flex flex-col items-center justify-center gap-2 cursor-pointer"
                    style={{
                        border: `2px dashed ${dragOver ? 'var(--color-corge-orange)' : pendingFile ? 'rgba(52,211,153,0.5)' : 'var(--glass-border)'}`,
                        background: dragOver ? 'rgba(255,90,31,0.05)' : pendingFile ? 'rgba(52,211,153,0.04)' : 'rgba(255,255,255,0.02)',
                        minHeight: '80px',
                        padding: '1.25rem',
                    }}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => !pendingFile && fileRef.current?.click()}
                >
                    {pendingFile ? (
                        <div className="flex items-center gap-3 w-full">
                            <span className="text-lg">📄</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate" style={{ color: '#34d399', fontFamily: 'var(--font-body)' }}>
                                    {pendingFile.name}
                                </p>
                                <p className="text-xs" style={{ color: 'rgba(242,242,242,0.4)', fontFamily: 'var(--font-body)' }}>
                                    {(pendingFile.size / 1024).toFixed(1)} KB — backend will parse automatically
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={e => { e.stopPropagation(); clearFile(); }}
                                className="text-xs px-2 py-1 rounded"
                                style={{
                                    background: 'rgba(248,113,113,0.1)',
                                    border: '1px solid rgba(248,113,113,0.3)',
                                    color: '#f87171',
                                    cursor: 'pointer',
                                    fontFamily: 'var(--font-body)',
                                }}
                            >
                                ✕ Remove
                            </button>
                        </div>
                    ) : (
                        <>
                            <span className="text-2xl">☁️</span>
                            <p className="text-sm text-center" style={{ color: 'rgba(242,242,242,0.5)', fontFamily: 'var(--font-body)' }}>
                                Drag & drop or <span style={{ color: 'var(--color-corge-orange)' }}>click to browse</span>
                            </p>
                            <p className="text-xs" style={{ color: 'rgba(242,242,242,0.3)', fontFamily: 'var(--font-body)' }}>
                                Supports: address only, address+mint_count, plain list
                            </p>
                        </>
                    )}
                </div>
                <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,.txt"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelected(f); }}
                />
            </div>

            {/* Divider */}
            {!pendingFile && (
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-px" style={{ background: 'var(--glass-border)' }} />
                    <span className="text-xs" style={{ color: 'rgba(242,242,242,0.3)', fontFamily: 'var(--font-body)' }}>or paste addresses</span>
                    <div className="flex-1 h-px" style={{ background: 'var(--glass-border)' }} />
                </div>
            )}

            {/* Textarea — hidden when file is selected */}
            {!pendingFile && (
                <div>
                    <div
                        className="relative rounded-xl"
                        style={{
                            border: '1px solid var(--glass-border)',
                            background: 'rgba(255,255,255,0.03)',
                        }}
                    >
                        <textarea
                            value={text}
                            onChange={e => setText(e.target.value)}
                            placeholder={"0xabc...\n0xdef...\n0x123..."}
                            rows={7}
                            className="w-full rounded-xl px-4 py-3 text-xs outline-none resize-y scrollbar-corge"
                            style={{
                                background: 'transparent',
                                color: 'rgba(242,242,242,0.8)',
                                fontFamily: 'monospace',
                                border: 'none',
                                minHeight: '120px',
                            }}
                        />
                    </div>
                    <div className="flex gap-3 mt-2 text-xs" style={{ fontFamily: 'var(--font-body)' }}>
                        {valid.length > 0 && <span style={{ color: '#34d399' }}>✓ {valid.length.toLocaleString()} valid</span>}
                        {invalid > 0 && <span style={{ color: '#f87171' }}>✗ {invalid} invalid (skipped)</span>}
                    </div>
                </div>
            )}

            {/* ── Resume from partial results ── */}
            <div>
                <div className="flex items-center gap-2 mb-1.5">
                    <label
                        className="block text-xs uppercase tracking-widest"
                        style={{ color: 'rgba(242,242,242,0.4)', fontFamily: 'var(--font-body)' }}
                    >
                        Resume from partial results
                    </label>
                    <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{
                            background: 'rgba(255,90,31,0.12)',
                            color: 'var(--color-corge-orange)',
                            fontFamily: 'var(--font-body)',
                            border: '1px solid rgba(255,90,31,0.2)',
                        }}
                    >
                        optional
                    </span>
                </div>
                <p className="text-xs mb-2" style={{ color: 'rgba(242,242,242,0.3)', fontFamily: 'var(--font-body)' }}>
                    Had a scan interrupted? Upload the partial CSV — already-scored wallets will be skipped and merged into the final results.
                </p>
                {partialFile ? (
                    <div
                        className="flex items-center gap-3 rounded-xl px-4 py-3"
                        style={{
                            background: 'rgba(255,90,31,0.06)',
                            border: '1px solid rgba(255,90,31,0.25)',
                        }}
                    >
                        <span className="text-base">📊</span>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-corge-orange)', fontFamily: 'var(--font-body)' }}>
                                {partialFile.name}
                            </p>
                            <p className="text-xs" style={{ color: 'rgba(242,242,242,0.4)', fontFamily: 'var(--font-body)' }}>
                                {(partialFile.size / 1024).toFixed(1)} KB — will be merged with new results
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={clearPartial}
                            className="text-xs px-2 py-1 rounded"
                            style={{
                                background: 'rgba(248,113,113,0.1)',
                                border: '1px solid rgba(248,113,113,0.3)',
                                color: '#f87171',
                                cursor: 'pointer',
                                fontFamily: 'var(--font-body)',
                            }}
                        >
                            ✕ Remove
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => partialRef.current?.click()}
                        className="w-full rounded-xl py-2.5 text-xs transition-all"
                        style={{
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px dashed rgba(255,90,31,0.3)',
                            color: 'rgba(242,242,242,0.4)',
                            fontFamily: 'var(--font-body)',
                            cursor: 'pointer',
                        }}
                    >
                        + Upload partial results CSV
                    </button>
                )}
                <input
                    ref={partialRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) { setPartialFile(f); setPartialError(null); }
                    }}
                />
                {partialError && (
                    <p className="text-xs mt-1.5" style={{ color: 'var(--color-error)', fontFamily: 'var(--font-body)' }}>
                        {partialError}
                    </p>
                )}
            </div>

            {error && (
                <p className="text-xs" style={{ color: 'var(--color-error)', fontFamily: 'var(--font-body)' }}>
                    {error}
                </p>
            )}

            <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full rounded-lg py-3.5 font-semibold text-sm transition-all flex items-center justify-center gap-2"
                style={{
                    background: !canSubmit ? 'rgba(255,90,31,0.4)' : 'var(--color-corge-orange)',
                    color: '#fff',
                    fontFamily: 'var(--font-body)',
                    cursor: !canSubmit ? 'not-allowed' : 'pointer',
                    border: 'none',
                    minHeight: '48px',
                }}
            >
                {isLoading ? (
                    <>
                        <span className="inline-block w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        {pendingFile ? 'Uploading...' : 'Starting scan...'}
                    </>
                ) : pendingFile ? (
                    partialFile ? 'Upload & Resume Scan' : 'Upload & Scan'
                ) : (
                    `Scan ${valid.length > 0 ? valid.length.toLocaleString() + ' wallets' : 'wallets'}`
                )}
            </button>
        </motion.div>
    );
}


import { useState, useRef } from 'react';
import { motion } from 'framer-motion';

const WALLET_REGEX = /^0x[a-fA-F0-9]{40}$/;
const MAX_ADDRESSES = 4000;

interface Props {
    onStartFromFile: (file: File, collectionName: string) => void;
    onStartFromAddresses: (body: Record<string, unknown>, collectionName: string) => void;
    isLoading: boolean;
}

function parseAddresses(raw: string): string[] {
    return raw
        .split(/[\n,;\t]+/)
        .map(s => s.trim().replace(/^["']|["']$/g, ''))
        .filter(s => s.length > 0);
}

export default function CollectionUpload({ onStartFromFile, onStartFromAddresses, isLoading }: Props) {
    const [collectionName, setCollectionName] = useState('');
    const [text, setText] = useState('');
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    // Derived counts for paste mode
    const parsed = parseAddresses(text);
    const valid = parsed.filter(a => WALLET_REGEX.test(a));
    const invalid = parsed.length - valid.length;

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

    function handleSubmit() {
        setError(null);

        if (pendingFile) {
            // CSV/TXT file — send directly to backend
            onStartFromFile(pendingFile, collectionName.trim());
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
        onStartFromAddresses({ addresses: valid }, collectionName.trim());
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
                    `Upload & Scan`
                ) : (
                    `Scan ${valid.length > 0 ? valid.length.toLocaleString() + ' wallets' : 'wallets'}`
                )}
            </button>
        </motion.div>
    );
}

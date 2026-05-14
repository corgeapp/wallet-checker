import { useState } from 'react';
import { motion } from 'framer-motion';

interface Props {
    onFetch: (contract: string, chain: number) => void;
    isLoading: boolean;
    error: string | null;
}

const CHAINS = [
    { id: 1, name: 'Ethereum' },
    { id: 137, name: 'Polygon' },
    { id: 8453, name: 'Base' },
];

export default function HoldersFetcher({ onFetch, isLoading, error }: Props) {
    const [contract, setContract] = useState('');
    const [chain, setChain] = useState(1);
    const [validationError, setValidationError] = useState('');

    const WALLET_RE = /^0x[a-fA-F0-9]{40}$/;

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!WALLET_RE.test(contract.trim())) {
            setValidationError('Enter a valid contract address (0x...)');
            return;
        }
        setValidationError('');
        onFetch(contract.trim(), chain);
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="glass-card w-full p-6 md:p-8"
        >
            <div className="mb-6">
                <h2 className="text-xl font-bold mb-2" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-corge-offwhite)' }}>
                    Fetch Current Holders
                </h2>
                <p className="text-sm" style={{ color: 'rgba(242,242,242,0.5)', fontFamily: 'var(--font-body)' }}>
                    Get the current NFT holders for any collection and their token counts
                </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                    <label className="block text-xs uppercase tracking-widest mb-1.5" style={{ color: 'rgba(242,242,242,0.4)', fontFamily: 'var(--font-body)' }}>
                        Contract Address
                    </label>
                    <input
                        type="text"
                        value={contract}
                        onChange={e => { setContract(e.target.value); setValidationError(''); }}
                        placeholder="0x..."
                        disabled={isLoading}
                        className="focus-orange w-full rounded-lg px-4 py-3 text-sm outline-none"
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: `1px solid ${validationError || error ? 'var(--color-error-border)' : 'var(--glass-border)'}`,
                            color: 'var(--color-corge-offwhite)',
                            fontFamily: 'monospace',
                            minHeight: '44px',
                        }}
                    />
                    {(validationError || error) && (
                        <p className="text-xs mt-1" style={{ color: 'var(--color-error)', fontFamily: 'var(--font-body)' }}>
                            {validationError || error}
                        </p>
                    )}
                </div>

                <div>
                    <label className="block text-xs uppercase tracking-widest mb-1.5" style={{ color: 'rgba(242,242,242,0.4)', fontFamily: 'var(--font-body)' }}>
                        Chain
                    </label>
                    <select
                        value={chain}
                        onChange={e => setChain(Number(e.target.value))}
                        disabled={isLoading}
                        className="focus-orange w-full rounded-lg px-4 py-3 text-sm outline-none"
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--glass-border)',
                            color: 'var(--color-corge-offwhite)',
                            fontFamily: 'var(--font-body)',
                            minHeight: '44px',
                        }}
                    >
                        {CHAINS.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full rounded-lg px-6 py-3 font-semibold transition-all"
                    style={{
                        background: isLoading ? 'rgba(255,90,31,0.5)' : 'var(--color-corge-orange)',
                        color: '#fff',
                        fontFamily: 'var(--font-body)',
                        minHeight: '44px',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        border: 'none',
                    }}
                >
                    {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="inline-block w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                            Fetching...
                        </span>
                    ) : (
                        'Fetch Holders'
                    )}
                </button>
            </form>
        </motion.div>
    );
}

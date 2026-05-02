import { useState } from 'react';
import { motion } from 'framer-motion';
import type { MintersFields } from '../../types';
import { SUPPORTED_CHAINS } from '../../types';

const WALLET_REGEX = /^0x[a-fA-F0-9]{40}$/;

interface Props {
    onFetch: (contract: string, chain: number, fields: MintersFields) => void;
    isLoading: boolean;
    error: string | null;
}

export default function MinterFetcher({ onFetch, isLoading, error }: Props) {
    const [contract, setContract] = useState('');
    const [chain, setChain] = useState(1);
    const [fields, setFields] = useState<MintersFields>('full');
    const [validationError, setValidationError] = useState<string | null>(null);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!WALLET_REGEX.test(contract.trim())) {
            setValidationError('Enter a valid contract address (0x...)');
            return;
        }
        setValidationError(null);
        onFetch(contract.trim(), chain, fields);
    }

    const displayError = validationError ?? error;

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
                    Minter Fetcher
                </h2>
                <p className="text-sm" style={{ color: 'rgba(242,242,242,0.5)', fontFamily: 'var(--font-body)' }}>
                    Fetch every wallet that minted from an NFT contract. Export as CSV or JSON, or send directly to the Collection Scanner.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                {/* Contract address */}
                <div>
                    <label
                        htmlFor="contract-address"
                        className="block text-xs uppercase tracking-widest mb-1.5"
                        style={{ color: 'rgba(242,242,242,0.4)', fontFamily: 'var(--font-body)' }}
                    >
                        NFT Contract Address
                    </label>
                    <input
                        id="contract-address"
                        type="text"
                        value={contract}
                        onChange={e => { setContract(e.target.value); setValidationError(null); }}
                        placeholder="0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D"
                        disabled={isLoading}
                        className="focus-orange w-full rounded-lg px-4 py-3 text-sm outline-none"
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: `1px solid ${displayError ? 'var(--color-error-border)' : 'var(--glass-border)'}`,
                            color: 'var(--color-corge-offwhite)',
                            fontFamily: 'monospace',
                            minHeight: '44px',
                        }}
                    />
                </div>

                {/* Chain + Fields row */}
                <div className="flex gap-3 flex-col sm:flex-row">
                    {/* Chain selector */}
                    <div className="flex-1">
                        <label
                            className="block text-xs uppercase tracking-widest mb-1.5"
                            style={{ color: 'rgba(242,242,242,0.4)', fontFamily: 'var(--font-body)' }}
                        >
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
                                cursor: 'pointer',
                            }}
                        >
                            {SUPPORTED_CHAINS.map(c => (
                                <option
                                    key={c.id}
                                    value={c.id}
                                    style={{ background: '#1a1a1a', color: '#f2f2f2' }}
                                >
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Fields toggle */}
                    <div className="flex-1">
                        <label
                            className="block text-xs uppercase tracking-widest mb-1.5"
                            style={{ color: 'rgba(242,242,242,0.4)', fontFamily: 'var(--font-body)' }}
                        >
                            Data fields
                        </label>
                        <div
                            className="flex gap-1 p-1 rounded-lg"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)' }}
                        >
                            {(['full', 'address'] as MintersFields[]).map(f => (
                                <button
                                    key={f}
                                    type="button"
                                    onClick={() => setFields(f)}
                                    disabled={isLoading}
                                    className="flex-1 rounded-md py-2 text-xs font-semibold transition-all"
                                    style={{
                                        background: fields === f ? 'var(--color-corge-orange)' : 'transparent',
                                        color: fields === f ? '#fff' : 'rgba(242,242,242,0.5)',
                                        fontFamily: 'var(--font-body)',
                                        border: 'none',
                                        cursor: isLoading ? 'not-allowed' : 'pointer',
                                        minHeight: '36px',
                                    }}
                                >
                                    {f === 'full' ? 'Address + Mints' : 'Address only'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {displayError && (
                    <p className="text-xs" style={{ color: 'var(--color-error)', fontFamily: 'var(--font-body)' }}>
                        {displayError}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full rounded-lg py-3.5 font-semibold text-sm transition-all flex items-center justify-center gap-2"
                    style={{
                        background: isLoading ? 'rgba(255,90,31,0.4)' : 'var(--color-corge-orange)',
                        color: '#fff',
                        fontFamily: 'var(--font-body)',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        border: 'none',
                        minHeight: '48px',
                    }}
                >
                    {isLoading ? (
                        <>
                            <span className="inline-block w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                            Fetching minters...
                        </>
                    ) : (
                        'Fetch Minters'
                    )}
                </button>
            </form>

            {/* Info note */}
            <p className="text-xs" style={{ color: 'rgba(242,242,242,0.3)', fontFamily: 'var(--font-body)' }}>
                Large collections (10k+ mints) take 20–30 seconds. Rate limited to 5 requests/min.
            </p>
        </motion.div>
    );
}

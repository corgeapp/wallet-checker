import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { validateWalletAddress } from '../utils/validation';
import type { InputFormProps } from '../types';
import type { RateLimitInfo } from '../api/client';

interface ExtendedInputFormProps extends InputFormProps {
    rateLimitInfo?: RateLimitInfo | null;
    isAdmin?: boolean;
}

function formatTimeRemaining(resetAt: string): string {
    const now = Date.now();
    const reset = new Date(resetAt).getTime();
    const diff = reset - now;

    if (diff <= 0) return 'Now';

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
}

export default function InputForm({ onSubmit, isLoading, error, rateLimitInfo, isAdmin }: ExtendedInputFormProps) {
    const [address, setAddress] = useState('');
    const [validationError, setValidationError] = useState<string | null>(null);
    const [timeRemaining, setTimeRemaining] = useState<string>('');

    // Update timer every second
    useEffect(() => {
        if (!rateLimitInfo?.resetAt) {
            setTimeRemaining('');
            return;
        }

        const updateTimer = () => {
            setTimeRemaining(formatTimeRemaining(rateLimitInfo.resetAt));
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [rateLimitInfo]);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const err = validateWalletAddress(address);
        if (err) {
            setValidationError(err);
            return;
        }
        setValidationError(null);
        onSubmit(address.trim());
    }

    const displayError = validationError ?? error;

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="glass-card w-full p-6 md:p-8"
        >
            <form onSubmit={handleSubmit} noValidate>
                <label
                    htmlFor="wallet-address"
                    className="block mb-2 text-sm font-medium"
                    style={{ fontFamily: 'var(--font-body)', color: 'rgba(242,242,242,0.7)' }}
                >
                    Wallet Address
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        id="wallet-address"
                        type="text"
                        value={address}
                        onChange={e => { setAddress(e.target.value); setValidationError(null); }}
                        placeholder="0x..."
                        disabled={isLoading}
                        aria-invalid={!!displayError}
                        aria-describedby={displayError ? 'wallet-error' : undefined}
                        className="focus-orange flex-1 rounded-lg px-4 py-3 text-sm outline-none transition-all"
                        style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: `1px solid ${displayError ? 'var(--color-error-border)' : 'var(--glass-border)'}`,
                            color: 'var(--color-corge-offwhite, #F2F2F2)',
                            fontFamily: 'var(--font-body)',
                            minHeight: '44px',
                        }}
                    />
                    <button
                        type="submit"
                        disabled={isLoading}
                        data-testid="submit-button"
                        className="flex items-center justify-center gap-2 rounded-lg px-6 font-semibold transition-all"
                        style={{
                            background: isLoading ? 'rgba(255,90,31,0.5)' : 'var(--color-corge-orange)',
                            color: '#fff',
                            fontFamily: 'var(--font-body)',
                            minHeight: '44px',
                            minWidth: '120px',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            border: 'none',
                        }}
                    >
                        {isLoading ? (
                            <>
                                <span
                                    data-testid="loading-spinner"
                                    className="inline-block w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
                                />
                                Checking...
                            </>
                        ) : (
                            'Check'
                        )}
                    </button>
                </div>
                {displayError && (
                    <p
                        id="wallet-error"
                        data-testid="input-error"
                        role="alert"
                        className="mt-2 text-xs"
                        style={{ color: 'var(--color-error)', fontFamily: 'var(--font-body)' }}
                    >
                        {displayError}
                    </p>
                )}
                {!isAdmin && rateLimitInfo && (
                    <div className="mt-2 text-xs" style={{ fontFamily: 'var(--font-body)' }}>
                        <p style={{ color: rateLimitInfo.remaining === 0 ? '#f87171' : 'rgba(242,242,242,0.5)' }}>
                            {rateLimitInfo.remaining > 0 ? (
                                <>
                                    <span style={{ fontWeight: 600 }}>{rateLimitInfo.remaining}</span> of {rateLimitInfo.limit} requests remaining
                                </>
                            ) : (
                                <>
                                    <span style={{ color: '#f87171', fontWeight: 600 }}>Rate limit reached</span>
                                    {timeRemaining && (
                                        <> · Next request in <span style={{ fontWeight: 600 }}>{timeRemaining}</span></>
                                    )}
                                </>
                            )}
                        </p>
                    </div>
                )}
                {isAdmin && (
                    <p className="mt-2 text-xs" style={{ color: '#34d399', fontFamily: 'var(--font-body)' }}>
                        ✓ Admin mode - Unlimited requests
                    </p>
                )}
            </form>
        </motion.div>
    );
}

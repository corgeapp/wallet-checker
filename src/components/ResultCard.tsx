import { motion } from 'framer-motion';
import { classifyScore, SCORE_CATEGORY_STYLES } from '../utils/score';
import type { ResultCardProps } from '../types';

const KNOWN_KEYS = new Set(['address', 'wallet_score', 'label']);

function formatKey(key: string): string {
    return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatValue(value: unknown): string {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') return value.toLocaleString();
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

export default function ResultCard({ result, onReset }: ResultCardProps) {
    const category = classifyScore(result.wallet_score);
    const style = SCORE_CATEGORY_STYLES[category];
    const extraFields = Object.entries(result).filter(([k]) => !KNOWN_KEYS.has(k));

    return (
        <motion.div
            data-testid="result-card"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className={`glass-card w-full p-6 md:p-8 flex flex-col gap-6 ${style.glowClass}`}
        >
            {/* Score header */}
            <div className="flex flex-col items-center gap-3 text-center">
                <span className="text-4xl">{style.emoji}</span>
                <div>
                    <p
                        className="text-6xl font-black leading-none"
                        style={{ fontFamily: 'var(--font-heading)', color: style.colorClass.replace('text-[', '').replace(']', '') }}
                        data-testid="wallet-score"
                    >
                        {result.wallet_score.toFixed(1)}
                    </p>
                    <p
                        className="text-xs uppercase tracking-widest mt-1"
                        style={{ color: 'rgba(242,242,242,0.5)', fontFamily: 'var(--font-body)' }}
                    >
                        Reputation Score
                    </p>
                </div>
                <span
                    data-testid="score-label"
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${style.badgeClass}`}
                    style={{ fontFamily: 'var(--font-body)' }}
                >
                    {style.label}
                </span>
            </div>

            {/* Backend label */}
            {result.label && result.label !== style.label && (
                <div
                    className="text-center text-sm"
                    style={{ color: 'rgba(242,242,242,0.6)', fontFamily: 'var(--font-body)' }}
                >
                    {result.label}
                </div>
            )}

            {/* Address */}
            <div
                className="rounded-lg px-4 py-3 text-xs break-all"
                style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--glass-border)',
                    color: 'rgba(242,242,242,0.5)',
                    fontFamily: 'monospace',
                }}
                data-testid="wallet-address"
            >
                {result.address}
            </div>

            {/* Extra fields */}
            {extraFields.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                    {extraFields.map(([key, value]) => (
                        <div
                            key={key}
                            data-testid={`field-${key}`}
                            className="rounded-lg px-3 py-2"
                            style={{
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid var(--glass-border)',
                            }}
                        >
                            <p
                                className="text-xs uppercase tracking-wide mb-0.5"
                                style={{ color: 'rgba(242,242,242,0.4)', fontFamily: 'var(--font-body)' }}
                            >
                                {formatKey(key)}
                            </p>
                            <p
                                className="text-sm font-medium"
                                style={{ color: 'rgba(242,242,242,0.85)', fontFamily: 'var(--font-body)' }}
                            >
                                {formatValue(value)}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* Reset button */}
            <button
                onClick={onReset}
                data-testid="reset-button"
                className="w-full rounded-lg py-3 text-sm font-semibold transition-all"
                style={{
                    background: 'transparent',
                    border: '1px solid var(--glass-border)',
                    color: 'rgba(242,242,242,0.7)',
                    fontFamily: 'var(--font-body)',
                    cursor: 'pointer',
                    minHeight: '44px',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-corge-orange)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-corge-orange)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--glass-border)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(242,242,242,0.7)'; }}
            >
                Check another wallet
            </button>
        </motion.div>
    );
}

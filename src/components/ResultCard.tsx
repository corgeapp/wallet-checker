import { motion } from 'framer-motion';
import { classifyScore, SCORE_CATEGORY_STYLES } from '../utils/score';
import type { ResultCardProps } from '../types';

export default function ResultCard({ result, onReset }: ResultCardProps) {
    const category = classifyScore(result.wallet_score);
    const style = SCORE_CATEGORY_STYLES[category];
    const isSweeper = result.is_sweeper as boolean | undefined;

    return (
        <motion.div
            data-testid="result-card"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className={`glass-card w-full p-6 md:p-8 flex flex-col gap-6 ${style.glowClass}`}
        >
            {/* Score */}
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
                        Wallet Score
                    </p>
                </div>
                <span
                    data-testid="score-label"
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${style.badgeClass}`}
                    style={{ fontFamily: 'var(--font-body)' }}
                >
                    {result.label}
                </span>
            </div>

            {/* is_sweeper pill */}
            {isSweeper == true && (
                <div className="flex justify-center">
                    <span
                        data-testid="field-is_sweeper"
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold"
                        style={{
                            background: isSweeper ? 'rgba(248,113,113,0.12)' : 'rgba(52,211,153,0.12)',
                            border: `1px solid ${isSweeper ? 'rgba(248,113,113,0.3)' : 'rgba(52,211,153,0.3)'}`,
                            color: isSweeper ? '#f87171' : '#34d399',
                            fontFamily: 'var(--font-body)',
                        }}
                    >
                        {isSweeper ? '🧹 Sweeper' : 'Not a sweeper'}
                    </span>
                </div>
            )}

            {/* Address */}
            <div
                className="rounded-lg px-4 py-3 text-xs break-all text-[black] font-medium"
                style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--glass-border)',
                    color: 'rgba(242,242,242,0.4)',
                    fontFamily: 'monospace',
                }}
                data-testid="wallet-address"
            >
                {result.address}
            </div>

            {/* Reset */}
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
                onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-corge-orange)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-corge-orange)';
                }}
                onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--glass-border)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'rgba(242,242,242,0.7)';
                }}
            >
                Check another wallet
            </button>
        </motion.div>
    );
}

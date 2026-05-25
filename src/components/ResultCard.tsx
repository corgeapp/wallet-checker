import { useState } from 'react';
import { motion } from 'framer-motion';
import { classifyScore, SCORE_CATEGORY_STYLES } from '../utils/score';
import type { ResultCardProps } from '../types';

export default function ResultCard({ result, onReset }: ResultCardProps) {
    const [isRenderOpen, setIsRenderOpen] = useState(false);
    const category = classifyScore(result.wallet_score);
    const style = SCORE_CATEGORY_STYLES[category];

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
                <div className="flex items-center justify-center gap-2">
                    <span
                        data-testid="score-label"
                        className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-lg font-bold ${style.badgeClass}`}
                        style={{ fontFamily: 'var(--font-body)' }}
                    >
                        {result.label}
                    </span>
                    <button
                        type="button"
                        onClick={() => setIsRenderOpen(true)}
                        data-testid="render-score-button"
                        aria-label="Render score card"
                        title="Render score card"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg transition-all"
                        style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid var(--glass-border)',
                            color: 'rgba(242,242,242,0.75)',
                            cursor: 'pointer',
                        }}
                    >
                        <svg
                            aria-hidden="true"
                            width="19"
                            height="19"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M6 9V2h12v7" />
                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                            <path d="M6 14h12v8H6z" />
                        </svg>
                    </button>
                </div>
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

            {isRenderOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.72)' }}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Score render preview"
                    data-testid="score-render-modal"
                >
                    <div className="relative w-full max-w-[420px]">
                        <button
                            type="button"
                            onClick={() => setIsRenderOpen(false)}
                            className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-lg transition-all"
                            style={{
                                background: 'rgba(0,0,0,0.18)',
                                border: '1px solid rgba(255,255,255,0.18)',
                                color: '#fff',
                                cursor: 'pointer',
                            }}
                            aria-label="Close render preview"
                            data-testid="close-render-button"
                        >
                            <svg
                                aria-hidden="true"
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                            >
                                <path d="M18 6 6 18" />
                                <path d="m6 6 12 12" />
                            </svg>
                        </button>
                        <div
                            className="aspect-square w-full overflow-hidden rounded-2xl p-8"
                            style={{
                                background: `radial-gradient(circle at 50% 20%, ${style.colorClass.replace('text-[', '').replace(']', '')}33, transparent 42%), linear-gradient(145deg, #151515 0%, #242424 100%)`,
                                border: '1px solid rgba(255,255,255,0.12)',
                                boxShadow: `0 24px 80px ${style.colorClass.replace('text-[', '').replace(']', '')}26`,
                            }}
                            data-testid="score-render-card"
                        >
                            <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
                                <span className="text-6xl">{style.emoji}</span>
                                <div>
                                    <p
                                        className="text-7xl font-black leading-none"
                                        style={{ fontFamily: 'var(--font-heading)', color: style.colorClass.replace('text-[', '').replace(']', '') }}
                                    >
                                        {result.wallet_score.toFixed(1)}
                                    </p>
                                    <p
                                        className="mt-2 text-sm uppercase tracking-widest"
                                        style={{ color: 'rgba(242,242,242,0.55)', fontFamily: 'var(--font-body)' }}
                                    >
                                        Wallet Score
                                    </p>
                                </div>
                                <span
                                    className={`inline-flex items-center rounded-full px-6 py-2.5 text-xl font-bold ${style.badgeClass}`}
                                    style={{ fontFamily: 'var(--font-body)' }}
                                >
                                    {result.label}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
}

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { classifyLabel, classifyScore, SCORE_CATEGORY_STYLES } from '../utils/score';
import { downloadScoreRenderPng, getStyleColor } from '../utils/scoreRender';
import type { ScoreCategory, WalletResult } from '../types';

const PRESETS: Array<{ category: ScoreCategory; score: number }> = [
    { category: 'diamond', score: 9.4 },
    { category: 'chad', score: 8.2 },
    { category: 'solid', score: 6.2 },
    { category: 'normal', score: 4.2 },
    { category: 'flipper', score: 2.8 },
    { category: 'paper', score: 1.8 },
    { category: 'jeet', score: 1.2 },
];

function makeDemoWallet() {
    const chars = '0123456789abcdef';
    let wallet = '0x';
    for (let index = 0; index < 40; index += 1) {
        wallet += chars[Math.floor(Math.random() * chars.length)];
    }
    return wallet;
}

function clampScore(value: number) {
    if (Number.isNaN(value)) return 0;
    return Math.min(10, Math.max(0, value));
}

function DemoPreview({ result }: { result: WalletResult }) {
    const category = classifyLabel(result.label) ?? classifyScore(result.wallet_score);
    const style = SCORE_CATEGORY_STYLES[category];
    const scoreColor = getStyleColor(style.colorClass);
    const scoreText = result.wallet_score.toFixed(1);

    return (
        <div
            className="aspect-square w-full overflow-hidden rounded-2xl p-7 sm:p-8"
            style={{
                background: `radial-gradient(circle at 50% 20%, ${scoreColor}33, transparent 42%), linear-gradient(145deg, #151515 0%, #242424 100%)`,
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: `0 24px 80px ${scoreColor}26`,
            }}
            data-testid="demo-score-card"
        >
            <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
                <span className="text-6xl">{style.emoji}</span>
                <div>
                    <p
                        className="text-7xl font-black leading-none"
                        style={{ fontFamily: 'var(--font-heading)', color: scoreColor }}
                        data-testid="demo-wallet-score"
                    >
                        {scoreText}
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
                    data-testid="demo-score-label"
                >
                    {result.label}
                </span>
            </div>
        </div>
    );
}

export default function DemoCardGenerator() {
    const [score, setScore] = useState(9.4);
    const [label, setLabel] = useState(SCORE_CATEGORY_STYLES.diamond.label);
    const [wallet, setWallet] = useState(makeDemoWallet());

    const result = useMemo<WalletResult>(() => ({
        address: wallet,
        wallet_score: clampScore(score),
        label: label.trim() || SCORE_CATEGORY_STYLES[classifyScore(score)].label,
    }), [label, score, wallet]);

    const category = classifyLabel(result.label) ?? classifyScore(result.wallet_score);
    const style = SCORE_CATEGORY_STYLES[category];
    const scoreColor = getStyleColor(style.colorClass);

    function applyPreset(nextCategory: ScoreCategory, nextScore: number) {
        setScore(nextScore);
        setLabel(SCORE_CATEGORY_STYLES[nextCategory].label);
    }

    function handleScoreChange(nextScore: number) {
        const normalizedScore = clampScore(nextScore);
        setScore(normalizedScore);
        setLabel(SCORE_CATEGORY_STYLES[classifyScore(normalizedScore)].label);
    }

    function downloadPng() {
        downloadScoreRenderPng(result.wallet_score.toFixed(1), result.label, style.emoji, scoreColor);
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="w-full flex flex-col gap-5"
        >
            <section className="glass-card p-5 md:p-6">
                <div className="flex flex-col gap-5">
                    <div className="flex flex-wrap gap-2">
                        {PRESETS.map(preset => {
                            const presetStyle = SCORE_CATEGORY_STYLES[preset.category];
                            const presetColor = getStyleColor(presetStyle.colorClass);
                            const active = category === preset.category;

                            return (
                                <button
                                    key={preset.category}
                                    type="button"
                                    onClick={() => applyPreset(preset.category, preset.score)}
                                    className="rounded-lg px-3 py-2 text-sm font-semibold transition-all"
                                    style={{
                                        background: active ? `${presetColor}24` : 'rgba(255,255,255,0.05)',
                                        border: `1px solid ${active ? `${presetColor}66` : 'var(--glass-border)'}`,
                                        color: active ? presetColor : 'rgba(242,242,242,0.68)',
                                        fontFamily: 'var(--font-body)',
                                        cursor: 'pointer',
                                        minHeight: '40px',
                                    }}
                                >
                                    {presetStyle.label}
                                </button>
                            );
                        })}
                    </div>

                    <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
                        <label className="flex flex-col gap-2">
                            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(242,242,242,0.45)' }}>
                                Score
                            </span>
                            <input
                                type="number"
                                min="0"
                                max="10"
                                step="0.1"
                                value={score}
                                onChange={(event) => handleScoreChange(Number(event.target.value))}
                                className="focus-orange w-full rounded-lg px-4 py-3 text-sm outline-none"
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid var(--glass-border)',
                                    color: 'var(--color-corge-offwhite)',
                                    fontFamily: 'var(--font-body)',
                                    minHeight: '44px',
                                }}
                            />
                        </label>

                        <label className="flex flex-col gap-2">
                            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(242,242,242,0.45)' }}>
                                Label
                            </span>
                            <input
                                type="text"
                                value={label}
                                onChange={(event) => setLabel(event.target.value)}
                                className="focus-orange w-full rounded-lg px-4 py-3 text-sm outline-none"
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid var(--glass-border)',
                                    color: 'var(--color-corge-offwhite)',
                                    fontFamily: 'var(--font-body)',
                                    minHeight: '44px',
                                }}
                            />
                        </label>

                        <button
                            type="button"
                            onClick={downloadPng}
                            className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold transition-all"
                            style={{
                                background: 'var(--color-corge-orange)',
                                border: 'none',
                                color: '#fff',
                                fontFamily: 'var(--font-body)',
                                cursor: 'pointer',
                                minHeight: '44px',
                            }}
                            data-testid="download-demo-card"
                        >
                            <svg
                                aria-hidden="true"
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <path d="M7 10l5 5 5-5" />
                                <path d="M12 15V3" />
                            </svg>
                            PNG
                        </button>
                    </div>

                    <label className="flex flex-col gap-2">
                        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(242,242,242,0.45)' }}>
                            Demo wallet
                        </span>
                        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                            <input
                                type="text"
                                value={wallet}
                                onChange={(event) => setWallet(event.target.value)}
                                className="focus-orange w-full rounded-lg px-4 py-3 text-sm outline-none"
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid var(--glass-border)',
                                    color: 'rgba(242,242,242,0.68)',
                                    fontFamily: 'monospace',
                                    minHeight: '44px',
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setWallet(makeDemoWallet())}
                                className="rounded-lg px-4 py-3 text-sm font-semibold transition-all"
                                style={{
                                    background: 'transparent',
                                    border: '1px solid var(--glass-border)',
                                    color: 'rgba(242,242,242,0.68)',
                                    fontFamily: 'var(--font-body)',
                                    cursor: 'pointer',
                                    minHeight: '44px',
                                }}
                            >
                                Randomize
                            </button>
                        </div>
                    </label>
                </div>
            </section>

            <DemoPreview result={result} />
        </motion.div>
    );
}

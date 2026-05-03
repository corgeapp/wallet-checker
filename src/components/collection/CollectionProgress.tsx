import { motion, AnimatePresence } from 'framer-motion';
import type { CollectionScanState } from '../../types';

interface Props {
    state: CollectionScanState;
}

const LABEL_COLORS: Record<string, string> = {
    'Diamond Hands': '#60a5fa',
    'Chad': '#34d399',
    'Solid': '#34d399',
    'Normal': '#a3a3a3',
    'Flipper': '#fbbf24',
    'Paper Hands': '#fbbf24',
    'Jeet': '#f87171',
};

export default function CollectionProgress({ state }: Props) {
    const { progress, stats, stalled, collectionName, phase, results } = state;
    const pct = progress?.percent ?? 0;
    const isStalled = phase === 'stalled';
    const isDone = phase === 'done';

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="glass-card w-full p-6 md:p-8 flex flex-col gap-6"
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2
                        className="text-lg font-bold"
                        style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-corge-offwhite)' }}
                    >
                        {collectionName || 'Collection Scan'}
                    </h2>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(242,242,242,0.4)', fontFamily: 'var(--font-body)' }}>
                        {isDone ? 'Scan complete' : isStalled ? 'Scan stalled' : 'Scanning wallets...'}
                    </p>
                </div>
                {(isDone || isStalled) && (
                    <span
                        className="text-xs px-2.5 py-1 rounded-full font-semibold"
                        style={{
                            background: isDone ? 'rgba(52,211,153,0.12)' : 'rgba(251,191,36,0.12)',
                            color: isDone ? '#34d399' : '#fbbf24',
                            border: `1px solid ${isDone ? 'rgba(52,211,153,0.3)' : 'rgba(251,191,36,0.3)'}`,
                            fontFamily: 'var(--font-body)',
                        }}
                    >
                        {isDone ? '✓ Done' : '⚠ Stalled'}
                    </span>
                )}
            </div>

            {/* Stall warning */}
            <AnimatePresence>
                {isStalled && stalled && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="rounded-xl px-4 py-3"
                        style={{
                            background: 'rgba(251,191,36,0.08)',
                            border: '1px solid rgba(251,191,36,0.3)',
                        }}
                    >
                        <p className="text-sm font-semibold mb-1" style={{ color: '#fbbf24', fontFamily: 'var(--font-body)' }}>
                            ⚠ Scan stalled
                        </p>
                        <p className="text-xs" style={{ color: 'rgba(242,242,242,0.6)', fontFamily: 'var(--font-body)' }}>
                            {stalled.message}
                        </p>
                        <p className="text-xs mt-1" style={{ color: '#fbbf24', fontFamily: 'var(--font-body)' }}>
                            {stalled.resultsCollected.toLocaleString()} results collected — you can still use them below.
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Progress bar */}
            {progress && (
                <div>
                    <div className="flex justify-between text-xs mb-2" style={{ fontFamily: 'var(--font-body)', color: 'rgba(242,242,242,0.5)' }}>
                        <span>{progress.completed.toLocaleString()} / {progress.total.toLocaleString()} wallets</span>
                        <span style={{ color: isDone ? '#34d399' : 'var(--color-corge-orange)' }}>{pct}%</span>
                    </div>
                    <div className="w-full rounded-full overflow-hidden" style={{ height: '6px', background: 'rgba(255,255,255,0.08)' }}>
                        <motion.div
                            className="h-full rounded-full"
                            style={{ background: isDone ? '#34d399' : 'var(--color-corge-orange)' }}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                        />
                    </div>
                    {progress.failed > 0 && (
                        <p className="text-xs mt-1" style={{ color: '#f87171', fontFamily: 'var(--font-body)' }}>
                            {progress.failed} failed
                        </p>
                    )}
                </div>
            )}

            {/* Live stats grid */}
            {stats && stats.total > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: 'Avg Score', value: stats.avg_score.toFixed(2) },
                        { label: 'Median', value: stats.median_score.toFixed(2) },
                        { label: 'Sweepers', value: stats.sweepers.toLocaleString() },
                        { label: 'New Wallets', value: stats.new_wallets.toLocaleString() },
                    ].map(({ label, value }) => (
                        <div
                            key={label}
                            className="rounded-xl px-3 py-3 text-center"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)' }}
                        >
                            <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'rgba(242,242,242,0.4)', fontFamily: 'var(--font-body)' }}>
                                {label}
                            </p>
                            <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-corge-offwhite)' }}>
                                {value}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* Label distribution */}
            {stats && Object.keys(stats.label_distribution).length > 0 && (
                <div>
                    <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'rgba(242,242,242,0.4)', fontFamily: 'var(--font-body)' }}>
                        Label distribution ({results.length.toLocaleString()} scored so far)
                    </p>
                    <div className="flex flex-col gap-2">
                        {Object.entries(stats.label_distribution)
                            .filter(([label]) => label !== 'New Wallet')
                            .sort(([, a], [, b]) => b - a)
                            .map(([label, count]) => {
                                const pctBar = stats.total > 0 ? (count / stats.total) * 100 : 0;
                                const color = LABEL_COLORS[label] ?? '#a3a3a3';
                                return (
                                    <div key={label} className="flex items-center gap-3">
                                        <span className="text-xs w-24 shrink-0" style={{ color, fontFamily: 'var(--font-body)' }}>
                                            {label}
                                        </span>
                                        <div className="flex-1 rounded-full overflow-hidden" style={{ height: '4px', background: 'rgba(255,255,255,0.08)' }}>
                                            <motion.div
                                                className="h-full rounded-full"
                                                style={{ background: color }}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${pctBar}%` }}
                                                transition={{ duration: 0.5 }}
                                            />
                                        </div>
                                        <span className="text-xs w-8 text-right" style={{ color: 'rgba(242,242,242,0.4)', fontFamily: 'var(--font-body)' }}>
                                            {count}
                                        </span>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            )}

            {/* Scanning pulse when running */}
            {!isDone && !isStalled && (
                <div className="flex items-center gap-2">
                    <motion.div
                        className="w-2 h-2 rounded-full"
                        style={{ background: 'var(--color-corge-orange)' }}
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <p className="text-xs" style={{ color: 'rgba(242,242,242,0.4)', fontFamily: 'var(--font-body)' }}>
                        Live — updating every 5 seconds
                    </p>
                </div>
            )}
        </motion.div>
    );
}

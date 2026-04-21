import { motion } from 'framer-motion';
import type { QueueCardProps } from '../types';

export default function QueueCard({ pollStatus, queuePosition, connectivityWarning }: QueueCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="glass-card w-full p-6 md:p-8 flex flex-col items-center gap-5 text-center"
        >
            {/* Animated ring */}
            <div className="relative flex items-center justify-center w-16 h-16">
                <div
                    className="absolute inset-0 rounded-full"
                    style={{
                        border: '2px solid var(--color-corge-orange)',
                        opacity: 0.3,
                    }}
                />
                <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{ border: '2px solid var(--color-corge-orange)' }}
                    animate={{ scale: [1, 1.15, 1], opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                />
                <span className="text-2xl">
                    {pollStatus === 'processing' ? '⚙️' : '⏳'}
                </span>
            </div>

            {pollStatus === 'queued' && queuePosition !== undefined ? (
                <>
                    <div>
                        <p
                            className="text-xs uppercase tracking-widest mb-1"
                            style={{ color: 'rgba(242,242,242,0.5)', fontFamily: 'var(--font-body)' }}
                        >
                            Position in queue
                        </p>
                        <motion.p
                            key={queuePosition}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-4xl font-bold"
                            style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-corge-orange)' }}
                            data-testid="queue-position"
                        >
                            #{queuePosition}
                        </motion.p>
                    </div>
                    <p
                        className="text-sm"
                        style={{ color: 'rgba(242,242,242,0.6)', fontFamily: 'var(--font-body)' }}
                    >
                        Your wallet is queued for analysis
                    </p>
                </>
            ) : (
                <>
                    <p
                        className="text-lg font-semibold"
                        style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-corge-offwhite, #F2F2F2)' }}
                        data-testid="processing-indicator"
                    >
                        Analysing wallet...
                    </p>
                    <p
                        className="text-sm"
                        style={{ color: 'rgba(242,242,242,0.6)', fontFamily: 'var(--font-body)' }}
                    >
                        Crunching on-chain data
                    </p>
                </>
            )}

            {connectivityWarning && (
                <div
                    data-testid="connectivity-warning"
                    className="w-full rounded-lg px-4 py-2 text-xs text-center"
                    style={{
                        background: 'rgba(251,191,36,0.1)',
                        border: '1px solid rgba(251,191,36,0.3)',
                        color: '#fbbf24',
                        fontFamily: 'var(--font-body)',
                    }}
                >
                    ⚠️ Connection issue — retrying...
                </div>
            )}
        </motion.div>
    );
}

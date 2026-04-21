import type { QueueStatusBannerProps } from '../types';

export default function QueueStatusBanner({ queueDepth, activeJobs }: QueueStatusBannerProps) {
    const isEmpty = queueDepth === 0;

    return (
        <div
            data-testid="queue-status-banner"
            className="w-full rounded-lg px-4 py-2.5 mb-4 flex items-center justify-between text-xs"
            style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--glass-border)',
                fontFamily: 'var(--font-body)',
                color: 'rgba(242,242,242,0.55)',
            }}
        >
            {isEmpty ? (
                <span data-testid="queue-empty-message">
                    ⚡ Queue is clear — results will be returned quickly
                </span>
            ) : (
                <span>
                    <span style={{ color: 'var(--color-corge-orange)' }}>{queueDepth}</span> wallet{queueDepth !== 1 ? 's' : ''} in queue
                    {' · '}
                    <span style={{ color: 'var(--color-corge-orange)' }}>{activeJobs}</span> processing
                </span>
            )}
        </div>
    );
}

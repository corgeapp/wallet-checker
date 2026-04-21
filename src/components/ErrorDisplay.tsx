import { ErrorDisplayProps } from '../types';

export default function ErrorDisplay({ message, recoverable, onRetry, onDismiss }: ErrorDisplayProps) {
    return (
        <div
            role="alert"
            style={{
                background: 'var(--color-error-bg)',
                border: '1px solid var(--color-error-border)',
                borderRadius: '1rem',
                padding: '1.25rem 1.5rem',
                backdropFilter: 'var(--glass-blur)',
                WebkitBackdropFilter: 'var(--glass-blur)',
            }}
        >
            <p
                data-testid="error-message"
                style={{
                    color: 'var(--color-error)',
                    fontFamily: 'var(--font-body)',
                    margin: '0 0 1rem 0',
                    fontSize: '0.95rem',
                    lineHeight: 1.5,
                }}
            >
                {message}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {recoverable && onRetry && (
                    <button
                        onClick={onRetry}
                        data-testid="retry-button"
                        style={{
                            background: 'var(--color-corge-orange)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '0.5rem',
                            padding: '0.5rem 1.25rem',
                            fontFamily: 'var(--font-body)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                        }}
                    >
                        Retry
                    </button>
                )}
                <button
                    onClick={onDismiss}
                    data-testid="dismiss-button"
                    style={{
                        background: 'transparent',
                        color: 'var(--color-error)',
                        border: '1px solid var(--color-error-border)',
                        borderRadius: '0.5rem',
                        padding: '0.5rem 1.25rem',
                        fontFamily: 'var(--font-body)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                    }}
                >
                    Dismiss
                </button>
            </div>
        </div>
    );
}

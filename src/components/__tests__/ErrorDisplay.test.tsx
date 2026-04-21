import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as fc from 'fast-check';
import ErrorDisplay from '../ErrorDisplay';

// Unit tests

describe('ErrorDisplay', () => {
    it('renders the error message', () => {
        render(
            <ErrorDisplay
                message="Service unavailable"
                recoverable={false}
                onDismiss={vi.fn()}
            />
        );
        expect(screen.getByTestId('error-message')).toHaveTextContent('Service unavailable');
    });

    it('always renders the Dismiss button', () => {
        render(
            <ErrorDisplay
                message="Error"
                recoverable={false}
                onDismiss={vi.fn()}
            />
        );
        expect(screen.getByTestId('dismiss-button')).toBeInTheDocument();
    });

    it('shows Retry button when recoverable is true', () => {
        render(
            <ErrorDisplay
                message="Timeout"
                recoverable={true}
                onRetry={vi.fn()}
                onDismiss={vi.fn()}
            />
        );
        expect(screen.getByTestId('retry-button')).toBeInTheDocument();
    });

    it('does not show Retry button when recoverable is false', () => {
        render(
            <ErrorDisplay
                message="Fatal error"
                recoverable={false}
                onDismiss={vi.fn()}
            />
        );
        expect(screen.queryByTestId('retry-button')).not.toBeInTheDocument();
    });

    it('calls onDismiss when Dismiss is clicked', async () => {
        const onDismiss = vi.fn();
        render(
            <ErrorDisplay
                message="Error"
                recoverable={false}
                onDismiss={onDismiss}
            />
        );
        await userEvent.click(screen.getByTestId('dismiss-button'));
        expect(onDismiss).toHaveBeenCalledOnce();
    });

    it('calls onRetry when Retry is clicked', async () => {
        const onRetry = vi.fn();
        render(
            <ErrorDisplay
                message="Timeout"
                recoverable={true}
                onRetry={onRetry}
                onDismiss={vi.fn()}
            />
        );
        await userEvent.click(screen.getByTestId('retry-button'));
        expect(onRetry).toHaveBeenCalledOnce();
    });

    it('renders with role="alert"', () => {
        render(
            <ErrorDisplay
                message="Error"
                recoverable={false}
                onDismiss={vi.fn()}
            />
        );
        expect(screen.getByRole('alert')).toBeInTheDocument();
    });
});

// Property-Based Test
// Feature: jeet-checker-frontend, Property 11: All error states render through ErrorDisplay component
// Validates: Requirements 7.3

describe('Property 11: All error states render through ErrorDisplay component', () => {
    it('renders any error message string inside ErrorDisplay with error color tokens', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1 }),
                fc.boolean(),
                (message, recoverable) => {
                    const { unmount } = render(
                        <ErrorDisplay
                            message={message}
                            recoverable={recoverable}
                            onRetry={vi.fn()}
                            onDismiss={vi.fn()}
                        />
                    );

                    // The error message element must be present and contain the message
                    const el = screen.getByTestId('error-message');
                    expect(el).toBeInTheDocument();
                    expect(el.textContent).toBe(message);

                    // The error color token must be applied via inline style
                    expect(el).toHaveStyle({ color: 'var(--color-error)' });

                    // Dismiss button always present
                    expect(screen.getByTestId('dismiss-button')).toBeInTheDocument();

                    // Retry button present iff recoverable
                    if (recoverable) {
                        expect(screen.getByTestId('retry-button')).toBeInTheDocument();
                    } else {
                        expect(screen.queryByTestId('retry-button')).not.toBeInTheDocument();
                    }

                    unmount();
                }
            ),
            { numRuns: 100 }
        );
    });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as fc from 'fast-check';
import QueueCard from '../QueueCard';

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => <div {...props}>{children}</div>,
        p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement> & { children?: React.ReactNode }) => <p {...props}>{children}</p>,
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('QueueCard', () => {
    it('shows queue position when pollStatus is queued', () => {
        render(<QueueCard pollStatus="queued" queuePosition={3} />);
        expect(screen.getByTestId('queue-position')).toHaveTextContent('#3');
    });

    it('shows processing indicator without queue position when pollStatus is processing', () => {
        render(<QueueCard pollStatus="processing" />);
        expect(screen.getByTestId('processing-indicator')).toBeInTheDocument();
        expect(screen.queryByTestId('queue-position')).not.toBeInTheDocument();
    });

    it('shows connectivity warning when connectivityWarning is true', () => {
        render(<QueueCard pollStatus="queued" queuePosition={1} connectivityWarning={true} />);
        expect(screen.getByTestId('connectivity-warning')).toBeInTheDocument();
    });

    it('does not show connectivity warning by default', () => {
        render(<QueueCard pollStatus="queued" queuePosition={1} />);
        expect(screen.queryByTestId('connectivity-warning')).not.toBeInTheDocument();
    });
});

// Property 5: Queue position always displayed accurately
// Feature: jeet-checker-frontend, Property 5
describe('Property 5: Queue position always displayed accurately', () => {
    it('displays the exact queue position passed as prop', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 1000 }),
                (position) => {
                    const { unmount } = render(<QueueCard pollStatus="queued" queuePosition={position} />);
                    expect(screen.getByTestId('queue-position')).toHaveTextContent(`#${position}`);
                    unmount();
                }
            ),
            { numRuns: 100 }
        );
    });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as fc from 'fast-check';
import ResultCard from '../ResultCard';
import type { WalletResult } from '../../types';

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const baseResult: WalletResult = {
    address: '0xabcdef1234567890abcdef1234567890abcdef12',
    wallet_score: 7.5,
    label: 'Solid',
};

describe('ResultCard', () => {
    it('renders wallet score', () => {
        render(<ResultCard result={baseResult} onReset={vi.fn()} />);
        expect(screen.getByTestId('wallet-score')).toHaveTextContent('7.5');
    });

    it('renders wallet address', () => {
        render(<ResultCard result={baseResult} onReset={vi.fn()} />);
        expect(screen.getByTestId('wallet-address')).toHaveTextContent(baseResult.address);
    });

    it('calls onReset when reset button is clicked', async () => {
        const onReset = vi.fn();
        render(<ResultCard result={baseResult} onReset={onReset} />);
        await userEvent.click(screen.getByTestId('reset-button'));
        expect(onReset).toHaveBeenCalledOnce();
    });

    it('renders the result card with data-testid', () => {
        render(<ResultCard result={baseResult} onReset={vi.fn()} />);
        expect(screen.getByTestId('result-card')).toBeInTheDocument();
    });
});

// Property 8: ResultCard renders all fields from done payload
// Feature: jeet-checker-frontend, Property 8
describe('Property 8: ResultCard renders all extra fields from payload', () => {
    it('renders every extra field key present in the result', () => {
        // Use safe identifier-like keys to avoid data-testid selector edge cases
        const safeKey = fc.stringMatching(/^[a-z][a-z0-9_]{0,18}$/)
            .filter(k => !['address', 'wallet_score', 'label'].includes(k));

        fc.assert(
            fc.property(
                fc.dictionary(
                    safeKey,
                    fc.oneof(fc.string(), fc.integer(), fc.boolean()),
                    { minKeys: 0, maxKeys: 8 }
                ),
                (extraFields) => {
                    const result: WalletResult = {
                        ...baseResult,
                        ...extraFields,
                    };
                    const { unmount } = render(<ResultCard result={result} onReset={vi.fn()} />);
                    for (const key of Object.keys(extraFields)) {
                        expect(screen.getByTestId(`field-${key}`)).toBeInTheDocument();
                    }
                    unmount();
                }
            ),
            { numRuns: 50 }
        );
    });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CollectionResults from '../CollectionResults';
import type { CollectionStats, CollectionWalletResult } from '../../../types';

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => <div {...props}>{children}</div>,
        tr: ({ children, ...props }: React.HTMLAttributes<HTMLTableRowElement> & { children?: React.ReactNode }) => <tr {...props}>{children}</tr>,
    },
}));

const results: CollectionWalletResult[] = [
    {
        wallet: '0x1111111111111111111111111111111111111111',
        wallet_score: 8.4,
        label: 'Chad',
        is_sweeper: false,
        flip_count: 4,
        confidence: 0.92,
    },
    {
        wallet: '0x2222222222222222222222222222222222222222',
        wallet_score: 4.2,
        label: 'Normal',
        is_sweeper: false,
        flip_count: 7,
        confidence: 0.8,
    },
];

const stats: CollectionStats = {
    total: 2,
    avg_score: 6.3,
    median_score: 6.3,
    min_score: 4.2,
    max_score: 8.4,
    sweepers: 0,
    new_wallets: 0,
    zero_flip_wallets: 0,
    label_distribution: { Chad: 1, Normal: 1 },
    score_distribution: { '40-50': 1, '80-90': 1 },
};

describe('CollectionResults failed wallet actions', () => {
    it('keeps failed wallets separate from scored results and retries only failed addresses', async () => {
        const onRetryFailed = vi.fn();
        const failedAddresses = [
            { wallet: '0x3333333333333333333333333333333333333333', error: 'timeout' },
            { wallet: '0x4444444444444444444444444444444444444444', error: '503 Service Unavailable' },
        ];

        render(
            <CollectionResults
                results={results}
                stats={stats}
                collectionName="Retry Collection"
                failedAddresses={failedAddresses}
                onReset={vi.fn()}
                onRetryFailed={onRetryFailed}
            />
        );

        expect(screen.getByText('Wallets scored')).toBeInTheDocument();
        expect(screen.getByText('Failed')).toBeInTheDocument();
        expect(screen.getByText('Retry 2 failed')).toBeInTheDocument();
        expect(screen.getByText('Export 2 failed')).toBeInTheDocument();

        await userEvent.click(screen.getByTestId('retry-failed-wallets-button'));

        expect(onRetryFailed).toHaveBeenCalledWith([
            failedAddresses[0].wallet,
            failedAddresses[1].wallet,
        ]);
    });

    it('does not show failed wallet actions when there are no failures', () => {
        render(
            <CollectionResults
                results={results}
                stats={stats}
                collectionName="Clean Collection"
                failedAddresses={[]}
                onReset={vi.fn()}
                onRetryFailed={vi.fn()}
            />
        );

        expect(screen.queryByTestId('retry-failed-wallets-button')).not.toBeInTheDocument();
        expect(screen.queryByTestId('export-failed-wallets-button')).not.toBeInTheDocument();
        expect(screen.getByText('New wallets')).toBeInTheDocument();
    });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as fc from 'fast-check';
import InputForm from '../InputForm';
import { WALLET_ADDRESS_REGEX } from '../../utils/validation';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('InputForm', () => {
    it('renders input and submit button', () => {
        render(<InputForm onSubmit={vi.fn()} isLoading={false} />);
        expect(screen.getByRole('textbox')).toBeInTheDocument();
        expect(screen.getByTestId('submit-button')).toBeInTheDocument();
    });

    it('disables submit button and shows spinner when isLoading', () => {
        render(<InputForm onSubmit={vi.fn()} isLoading={true} />);
        expect(screen.getByTestId('submit-button')).toBeDisabled();
        expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('shows inline error when error prop is provided', () => {
        render(<InputForm onSubmit={vi.fn()} isLoading={false} error="Service unavailable" />);
        expect(screen.getByTestId('input-error')).toHaveTextContent('Service unavailable');
    });

    it('shows validation error for empty submission', async () => {
        render(<InputForm onSubmit={vi.fn()} isLoading={false} />);
        await userEvent.click(screen.getByTestId('submit-button'));
        expect(screen.getByTestId('input-error')).toBeInTheDocument();
    });

    it('shows validation error for invalid address', async () => {
        render(<InputForm onSubmit={vi.fn()} isLoading={false} />);
        await userEvent.type(screen.getByRole('textbox'), 'not-an-address');
        await userEvent.click(screen.getByTestId('submit-button'));
        expect(screen.getByTestId('input-error')).toBeInTheDocument();
    });

    it('calls onSubmit with valid address', async () => {
        const onSubmit = vi.fn();
        render(<InputForm onSubmit={onSubmit} isLoading={false} />);
        await userEvent.type(screen.getByRole('textbox'), '0xabcdef1234567890abcdef1234567890abcdef12');
        await userEvent.click(screen.getByTestId('submit-button'));
        expect(onSubmit).toHaveBeenCalledWith('0xabcdef1234567890abcdef1234567890abcdef12');
    });
});

// Property 1: Valid address submission always calls onSubmit with correct address
// Feature: jeet-checker-frontend, Property 1
describe('Property 1: Valid address always calls onSubmit with correct address', () => {
    it('calls onSubmit with the exact valid address entered', () => {
        fc.assert(
            fc.property(
                fc.hexaString({ minLength: 40, maxLength: 40 }).map(h => '0x' + h),
                (address) => {
                    const onSubmit = vi.fn();
                    const { unmount } = render(<InputForm onSubmit={onSubmit} isLoading={false} />);
                    const input = screen.getByRole('textbox');
                    const button = screen.getByTestId('submit-button');
                    fireEvent.change(input, { target: { value: address } });
                    fireEvent.click(button);
                    expect(onSubmit).toHaveBeenCalledWith(address);
                    unmount();
                }
            ),
            { numRuns: 100 }
        );
    });
});

// Property 2: Invalid address never calls onSubmit
// Feature: jeet-checker-frontend, Property 2
describe('Property 2: Invalid address never calls onSubmit', () => {
    it('does not call onSubmit for invalid addresses', () => {
        fc.assert(
            fc.property(
                fc.string().filter(s => !WALLET_ADDRESS_REGEX.test(s.trim())),
                (address) => {
                    const onSubmit = vi.fn();
                    const { unmount } = render(<InputForm onSubmit={onSubmit} isLoading={false} />);
                    const input = screen.getByRole('textbox');
                    const button = screen.getByTestId('submit-button');
                    fireEvent.change(input, { target: { value: address } });
                    fireEvent.click(button);
                    expect(onSubmit).not.toHaveBeenCalled();
                    unmount();
                }
            ),
            { numRuns: 100 }
        );
    });
});

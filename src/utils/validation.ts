// src/utils/validation.ts
export const WALLET_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/;

export function validateWalletAddress(input: string): string | null {
    const trimmed = input.trim();
    if (!trimmed) return 'Wallet address is required';
    if (!WALLET_ADDRESS_REGEX.test(trimmed)) {
        return 'Enter a valid Ethereum address (0x followed by 40 hex characters)';
    }
    return null;
}

// src/types/index.ts

export type ScoreCategory = 'diamond' | 'holder' | 'neutral' | 'weak' | 'jeet';

export interface WalletResult {
    address: string;
    wallet_score: number;
    label: string;
    [key: string]: unknown;
}

export type AppState =
    | { status: 'idle' }
    | { status: 'submitting' }
    | { status: 'polling'; jobId: string; pollStatus: 'queued' | 'processing'; queuePosition?: number }
    | { status: 'done'; result: WalletResult }
    | { status: 'error'; message: string; recoverable: boolean };

// API types
export interface SubmitWalletRequest {
    address: string;
}

export interface SubmitWalletResponse {
    jobId: string;
    status: string;
    position?: number;
}

export type JobStatusResponse =
    | { status: 'queued'; position: number }
    | { status: 'processing' }
    | { status: 'done'; data: WalletResult };

export interface QueueStatus {
    queueDepth: number;
    activeJobs: number;
}

// Component prop interfaces
export interface InputFormProps {
    onSubmit: (address: string) => void;
    isLoading: boolean;
    error?: string;
}

export interface QueueCardProps {
    pollStatus: 'queued' | 'processing';
    queuePosition?: number;
    connectivityWarning?: boolean;
}

export interface ResultCardProps {
    result: WalletResult;
    onReset: () => void;
}

export interface ErrorDisplayProps {
    message: string;
    recoverable: boolean;
    onRetry?: () => void;
    onDismiss: () => void;
}

export interface QueueStatusBannerProps {
    queueDepth: number;
    activeJobs: number;
}

// ─── Collection Scanner Types ─────────────────────────────────────────────────

/**
 * Represents a wallet analysis result from the collection scanner.
 * 
 * This interface includes both core wallet scoring fields and optional holder metrics.
 * All holder metrics fields are optional to maintain backward compatibility with
 * existing localStorage data and API responses that may not include these fields.
 */
export interface CollectionWalletResult {
    // Core wallet scoring fields
    wallet: string;
    wallet_score: number;
    label: string;
    is_sweeper: boolean;
    flip_count: number;
    confidence: number;
    is_new_wallet?: boolean;
    first_tx_date?: string | null;
    transferred?: boolean | null;
    transferred_to?: string | null;
    transferred_at?: string | null;
    token_id?: string | null;
    tx_hash?: string | null;
    transfer_type?: 'sale' | 'transfer' | 'unknown' | null;

    /**
     * Holder metrics - Optional fields providing deeper insights into wallet behavior.
     * These fields may be undefined for:
     * - Results from older API versions
     * - Results loaded from localStorage before holder metrics were added
     * - Wallets where holder analysis is not available
     * 
     * UI components must use optional chaining (?.) or nullish coalescing (??)
     * when accessing these fields to ensure graceful degradation.
     */

    /**
     * Composite score indicating holder quality (typically 0-100).
     * Higher scores indicate stronger holder behavior patterns.
     */
    holder_score?: number;

    /**
     * Human-readable classification label for holder behavior.
     * Examples: "Strong Holder", "Active Trader", "Collector"
     */
    holder_label?: string;

    /**
     * Total number of NFT purchases made by this wallet.
     * Non-negative integer representing historical buy transactions.
     */
    total_buys?: number;

    /**
     * Total USD value spent on NFT purchases.
     * Non-negative number representing cumulative spending.
     */
    total_usd_spent?: number;

    /**
     * Number of distinct NFT collections held by this wallet.
     * Non-negative integer indicating collection diversity.
     */
    unique_collections?: number;

    /**
     * Average purchase price in USD across all NFT buys.
     * Non-negative number calculated as total_usd_spent / total_buys.
     */
    avg_buy_price_usd?: number;

    /**
     * Ratio of minted NFTs to total NFT acquisitions (0-1 inclusive).
     * 0 = all secondary purchases, 1 = all mints, 0.5 = equal mix.
     */
    mint_ratio?: number;
}

export interface CollectionProgress {
    total: number;
    completed: number;
    failed: number;
    remaining: number;
    percent: number;
}

export interface CollectionStats {
    total: number;
    avg_score: number;
    median_score: number;
    min_score: number;
    max_score: number;
    sweepers: number;
    new_wallets: number;
    zero_flip_wallets: number;
    label_distribution: Record<string, number>;
    score_distribution: Record<string, number>;
}

export interface CollectionStalled {
    message: string;
    stalledAt: number;
    resultsCollected: number;
}

export type CollectionStatus = 'running' | 'done' | 'stalled' | 'cancelled';

export interface CollectionSessionResponse {
    sessionId: string;
    collectionName?: string;
    status: CollectionStatus;
    progress: CollectionProgress;
    stalled: CollectionStalled | null;
    cancelled?: { reason: string };
    stats: CollectionStats;
    results: CollectionWalletResult[];
    failed?: Array<{ wallet: string; error: string }>;
}

export interface CollectionScanResponse {
    success: boolean;
    sessionId: string;
    total: number;
    invalid: number;
    message: string;
}

export interface CollectionScanState {
    phase: 'idle' | 'uploading' | 'scanning' | 'done' | 'stalled' | 'cancelled' | 'interrupted' | 'error';
    sessionId: string | null;
    collectionName: string;
    progress: CollectionProgress | null;
    stats: CollectionStats | null;
    results: CollectionWalletResult[];
    failedAddresses: Array<{ wallet: string; error: string }>;
    stalled: CollectionStalled | null;
    error: string | null;
    totalSubmitted: number;
    invalidCount: number;
}

// ─── Minters Types ────────────────────────────────────────────────────────────

export interface MinterResult {
    address: string;
    mint_count?: number;
}

export interface MintersResponse {
    success: boolean;
    contract: string;
    chain_id: number;
    total_minters: number;
    total_mints: number;
    results: MinterResult[];
}

export type MintersFields = 'address' | 'full';

export interface MintersState {
    phase: 'idle' | 'loading' | 'done' | 'error';
    contract: string;
    chain: number;
    fields: MintersFields;
    data: MintersResponse | null;
    error: string | null;
}

export const SUPPORTED_CHAINS: { id: number; name: string }[] = [
    { id: 1, name: 'Ethereum' },
    { id: 137, name: 'Polygon' },
    { id: 8453, name: 'Base' },
    { id: 42161, name: 'Arbitrum' },
    { id: 10, name: 'Optimism' },
    { id: 56, name: 'BNB Chain' },
];

// ─── First TX Types ───────────────────────────────────────────────────────────

export interface FirstTxResult {
    wallet: string;
    first_tx_date: string | null;
    first_tx_hash: string | null;
    first_tx_block: number | null;
}

export interface FirstTxSessionResponse {
    sessionId: string;
    status: 'running' | 'done';
    progress: {
        completed: number;
        total: number;
        percent: number;
    };
    results: FirstTxResult[];
}

export interface FirstTxScanResponse {
    sessionId: string;
    total: number;
}

export interface CollectionWalletResultWithFirstTx extends CollectionWalletResult {
    first_tx_date?: string | null;
}

// ─── Transfer Check Types ─────────────────────────────────────────────────────

export interface TransferResult {
    address: string;
    transferred: boolean;
    to: string | null;
    token_id: string | null;
    tx_hash: string | null;
    transferred_at: string | null;
    type?: 'sale' | 'transfer' | 'unknown' | null;
}

export interface TransferSessionResponse {
    status: 'running' | 'done' | 'error';
    progress: {
        total: number;
        completed: number;
        remaining: number;
        percent: number;
    };
    transferred: number;
    not_transferred: number;
    sales: number;
    plain_transfers: number;
    results: TransferResult[];
}

export interface TransferCheckResponse {
    success: boolean;
    contract: string;
    total: number;
    transferred: number;
    not_transferred: number;
    sales?: number;
    plain_transfers?: number;
    errors: number;
    results: TransferResult[];
}

export interface TransferStartResponse {
    sessionId: string;
    total: number;
}

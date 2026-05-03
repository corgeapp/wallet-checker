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

export interface CollectionWalletResult {
    wallet: string;
    wallet_score: number;
    label: string;
    is_sweeper: boolean;
    flip_count: number;
    confidence: number;
    is_new_wallet?: boolean;
    first_tx_date?: string | null;
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
    address: string;
    first_tx_date: string | null;  // ISO date string or null if not found
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

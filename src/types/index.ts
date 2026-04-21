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

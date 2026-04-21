// src/api/client.ts
import type { JobStatusResponse, QueueStatus, WalletResult } from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
    constructor(
        public readonly status: number,
        message: string,
        public readonly isTransient: boolean = false
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

export class NetworkError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NetworkError';
    }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    let response: Response;
    try {
        response = await fetch(`${BASE_URL}${path}`, {
            headers: { 'Content-Type': 'application/json', ...init?.headers },
            ...init,
        });
    } catch (err) {
        throw new NetworkError(err instanceof Error ? err.message : 'Network request failed');
    }

    if (!response.ok) {
        const isTransient = response.status >= 500;
        let message = `Request failed with status ${response.status}`;
        try {
            const body = await response.json() as { message?: string; error?: string };
            message = body.message ?? body.error ?? message;
        } catch {
            // ignore JSON parse errors
        }
        throw new ApiError(response.status, message, isTransient);
    }

    return response.json() as Promise<T>;
}

// What POST /wallet actually returns (two shapes)
export type SubmitWalletResult =
    | { cached: true; data: WalletResult }
    | { cached?: false; jobId: string; status: string; position?: number };

export async function submitWallet(address: string): Promise<SubmitWalletResult> {
    return request<SubmitWalletResult>('/wallet', {
        method: 'POST',
        body: JSON.stringify({ address }),
    });
}

export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
    return request<JobStatusResponse>(`/wallet/job/${jobId}`);
}

export async function getQueueStatus(): Promise<QueueStatus> {
    return request<QueueStatus>('/queue/status');
}

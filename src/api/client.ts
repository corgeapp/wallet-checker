// src/api/client.ts
import type { JobStatusResponse, QueueStatus, WalletResult } from '../types';
import { getAuthHeaders } from '../utils/apiKey';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
    constructor(
        public readonly status: number,
        message: string,
        public readonly isTransient: boolean = false,
        public readonly rateLimitInfo?: RateLimitInfo
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

export interface RateLimitInfo {
    remaining: number;
    resetAt: string; // ISO timestamp
    limit: number;
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
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders(),  // Auto-inject API key
                ...init?.headers
            },
            ...init,
        });
    } catch (err) {
        throw new NetworkError(err instanceof Error ? err.message : 'Network request failed');
    }

    if (!response.ok) {
        const isTransient = response.status >= 500;
        let message = `Request failed with status ${response.status}`;
        let rateLimitInfo: RateLimitInfo | undefined;

        try {
            const body = await response.json() as { message?: string; error?: string; rateLimit?: RateLimitInfo };
            message = body.message ?? body.error ?? message;
            rateLimitInfo = body.rateLimit;
        } catch {
            // ignore JSON parse errors
        }

        // Extract rate limit info from headers if not in body
        if (!rateLimitInfo && response.status === 429) {
            const remaining = response.headers.get('X-RateLimit-Remaining');
            const resetAt = response.headers.get('X-RateLimit-Reset');
            const limit = response.headers.get('X-RateLimit-Limit');

            if (remaining !== null && resetAt !== null && limit !== null) {
                rateLimitInfo = {
                    remaining: parseInt(remaining, 10),
                    resetAt,
                    limit: parseInt(limit, 10)
                };
            }
        }

        throw new ApiError(response.status, message, isTransient, rateLimitInfo);
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

// ─── Collection API ───────────────────────────────────────────────────────────

import type { CollectionScanResponse, CollectionSessionResponse, CollectionProgressResponse } from '../types';

// Flexible body — accepts any of the formats the backend supports:
// - { addresses: string[] }
// - { addresses: MinterResult[] }
// - Full MintersResponse (spread with optional collectionName)
// - Any object with results/data/wallets/holders key
export async function startCollectionScan(
    body: Record<string, unknown>,
    collectionName?: string
): Promise<CollectionScanResponse> {
    const payload = collectionName ? { ...body, collectionName } : body;
    return request<CollectionScanResponse>('/collection/scan', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export async function startCollectionScanCSV(
    file: File,
    collectionName?: string
): Promise<CollectionScanResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (collectionName) formData.append('collectionName', collectionName);

    let response: Response;
    try {
        response = await fetch(`${BASE_URL}/collection/scan/csv`, {
            method: 'POST',
            body: formData,
            // No Content-Type header — browser sets it with boundary automatically
        });
    } catch (err) {
        throw new NetworkError(err instanceof Error ? err.message : 'Network request failed');
    }

    if (!response.ok) {
        let message = `Request failed with status ${response.status}`;
        try {
            const body = await response.json() as { message?: string; error?: string };
            message = body.message ?? body.error ?? message;
        } catch { /* ignore */ }
        throw new ApiError(response.status, message, response.status >= 500);
    }

    return response.json() as Promise<CollectionScanResponse>;
}

export async function getCollectionSession(sessionId: string): Promise<CollectionSessionResponse> {
    return request<CollectionSessionResponse>(`/collection/session/${sessionId}`);
}

/**
 * Get lightweight progress updates for a collection session.
 * This endpoint returns only progress data without the full results array,
 * making it much more efficient for polling during large scans.
 */
export async function getCollectionProgress(sessionId: string): Promise<CollectionProgressResponse> {
    return request<CollectionProgressResponse>(`/collection/session/${sessionId}/progress`);
}

/**
 * Cancel an active collection session.
 * Uses `keepalive: true` so the request survives page unload.
 * Falls back to `navigator.sendBeacon` when called from a beforeunload handler.
 */
export async function cancelCollectionSession(sessionId: string): Promise<void> {
    try {
        await fetch(`${BASE_URL}/collection/session/${sessionId}`, {
            method: 'DELETE',
            keepalive: true,
        });
    } catch {
        // Best-effort — ignore errors (page may be unloading)
    }
}

/**
 * Fire-and-forget cancel via sendBeacon (safe to call from beforeunload).
 * sendBeacon only supports POST, so we send a JSON body with `_method: "DELETE"`.
 */
export function cancelCollectionSessionBeacon(sessionId: string): void {
    const url = `${BASE_URL}/collection/session/${sessionId}`;
    const sent = navigator.sendBeacon(url, JSON.stringify({ _method: 'DELETE' }));
    if (!sent) {
        // sendBeacon failed (e.g. data too large) — fall back to keepalive fetch
        fetch(url, { method: 'DELETE', keepalive: true }).catch(() => undefined);
    }
}

// ─── Minters API ──────────────────────────────────────────────────────────────

import type { MintersResponse, MintersFields } from '../types';

export async function getMinters(
    contract: string,
    chain: number,
    fields: MintersFields
): Promise<MintersResponse> {
    const params = new URLSearchParams({
        contract,
        chain: String(chain),
        fields,
        format: 'json',
    });
    return request<MintersResponse>(`/collection/minters?${params.toString()}`);
}

// Returns the direct URL for CSV download (browser handles it natively)
export function getMintersCSVUrl(contract: string, chain: number, fields: MintersFields): string {
    const params = new URLSearchParams({
        contract,
        chain: String(chain),
        fields,
        format: 'csv',
    });
    return `${BASE_URL}/collection/minters?${params.toString()}`;
}

// ─── First TX API ─────────────────────────────────────────────────────────────

import type { FirstTxScanResponse, FirstTxSessionResponse } from '../types';

export async function startFirstTxScan(addresses: string[]): Promise<FirstTxScanResponse> {
    return request<FirstTxScanResponse>('/wallets/first-tx', {
        method: 'POST',
        body: JSON.stringify({ addresses }),
    });
}

export async function getFirstTxSession(sessionId: string): Promise<FirstTxSessionResponse> {
    return request<FirstTxSessionResponse>(`/wallets/first-tx/${sessionId}`);
}

// ─── Transfer Check API ───────────────────────────────────────────────────────

import type { TransferStartResponse, TransferSessionResponse } from '../types';

export async function startTransferCheck(
    contract: string,
    addresses: string[]
): Promise<TransferStartResponse> {
    return request<TransferStartResponse>('/collection/transfer-to?classify=true', {
        method: 'POST',
        body: JSON.stringify({ contract, addresses }),
    });
}

export async function getTransferSession(sessionId: string): Promise<TransferSessionResponse> {
    return request<TransferSessionResponse>(`/collection/transfer-to/${sessionId}`);
}

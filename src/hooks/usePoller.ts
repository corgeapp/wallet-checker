// src/hooks/usePoller.ts
import { useEffect, useRef } from 'react';
import { getJobStatus } from '../api/client';
import { ApiError, NetworkError } from '../api/client';
import type { JobStatusResponse } from '../types';

export const POLL_INTERVAL_MS = 3000;
export const POLL_TIMEOUT_MS = 300_000; // 5 minutes

export interface PollError {
    message: string;
    fatal: boolean;
}

export function usePoller(
    jobId: string | null,
    onTick: (response: JobStatusResponse) => void,
    onError: (err: PollError) => void
): void {
    // Use refs to always have latest callbacks without re-triggering effect
    const onTickRef = useRef(onTick);
    const onErrorRef = useRef(onError);
    onTickRef.current = onTick;
    onErrorRef.current = onError;

    useEffect(() => {
        if (!jobId) return;

        const startTime = Date.now();

        const intervalId = setInterval(async () => {
            // Check timeout
            if (Date.now() - startTime >= POLL_TIMEOUT_MS) {
                clearInterval(intervalId);
                onErrorRef.current({
                    message: 'Timed out waiting for result. Please try again.',
                    fatal: true,
                });
                return;
            }

            try {
                const response = await getJobStatus(jobId);
                onTickRef.current(response);
                // If done, the parent will set jobId to null which will clean up via the effect
            } catch (err) {
                if (err instanceof NetworkError) {
                    // Non-fatal: connectivity issue, retry next tick
                    onErrorRef.current({
                        message: 'Connection issue — retrying...',
                        fatal: false,
                    });
                } else if (err instanceof ApiError) {
                    // Fatal: stop polling
                    clearInterval(intervalId);
                    onErrorRef.current({
                        message: err.message,
                        fatal: true,
                    });
                } else {
                    // Unknown error — treat as fatal
                    clearInterval(intervalId);
                    onErrorRef.current({
                        message: 'An unexpected error occurred.',
                        fatal: true,
                    });
                }
            }
        }, POLL_INTERVAL_MS);

        return () => clearInterval(intervalId);
    }, [jobId]);
}

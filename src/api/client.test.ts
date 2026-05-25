import { afterEach, describe, expect, it, vi } from 'vitest';
import { startCollectionScanCSV, submitWallet } from './client';

describe('API client admin auth', () => {
    afterEach(() => {
        localStorage.clear();
        vi.unstubAllGlobals();
    });

    it('sends the admin API key on wallet checks', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({ jobId: 'job-1', status: 'queued' }),
        });
        vi.stubGlobal('fetch', fetchMock);
        localStorage.setItem('corge_admin_api_key', 'admin-secret');

        await submitWallet('0xabcdef1234567890abcdef1234567890abcdef12');

        const [, init] = fetchMock.mock.calls[0];
        const headers = init.headers as Headers;

        expect(headers.get('X-API-Key')).toBe('admin-secret');
        expect(headers.get('Content-Type')).toBe('application/json');
    });

    it('sends the admin API key on CSV scans without overriding multipart content type', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({
                success: true,
                sessionId: 'session-1',
                total: 1,
                invalid: 0,
                message: 'started',
            }),
        });
        vi.stubGlobal('fetch', fetchMock);
        localStorage.setItem('corge_admin_api_key', 'admin-secret');

        await startCollectionScanCSV(new File(['address\n0xabcdef1234567890abcdef1234567890abcdef12'], 'wallets.csv'));

        const [, init] = fetchMock.mock.calls[0];
        const headers = init.headers as Headers;

        expect(headers.get('X-API-Key')).toBe('admin-secret');
        expect(headers.has('Content-Type')).toBe(false);
    });
});

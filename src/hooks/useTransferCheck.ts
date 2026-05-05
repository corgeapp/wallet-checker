import { useState } from 'react';
import { checkTransferTo } from '../api/client';
import type { TransferResult } from '../types';

export type TransferPhase = 'idle' | 'loading' | 'done' | 'error';

export interface TransferCheckState {
    phase: TransferPhase;
    total: number;
    transferred: number;
    not_transferred: number;
    results: TransferResult[];
    error: string | null;
}

const INITIAL: TransferCheckState = {
    phase: 'idle',
    total: 0,
    transferred: 0,
    not_transferred: 0,
    results: [],
    error: null,
};

export function useTransferCheck() {
    const [state, setState] = useState<TransferCheckState>(INITIAL);

    async function startCheck(contract: string, addresses: string[]) {
        setState({ ...INITIAL, phase: 'loading', total: addresses.length });
        try {
            const data = await checkTransferTo(contract, addresses);
            setState({
                phase: 'done',
                total: data.total,
                transferred: data.transferred,
                not_transferred: data.not_transferred,
                results: data.results,
                error: null,
            });
        } catch (err) {
            setState(prev => ({
                ...prev,
                phase: 'error',
                error: err instanceof Error ? err.message : 'Transfer check failed',
            }));
        }
    }

    function reset() {
        setState(INITIAL);
    }

    return { state, startCheck, reset };
}

import { useState, useCallback, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { submitWallet, getMinters, cancelCollectionSessionBeacon } from './api/client';
import { NetworkError } from './api/client';
import { usePoller } from './hooks/usePoller';
import { useQueueStatus } from './hooks/useQueueStatus';
import { useCollectionScanner } from './hooks/useCollectionScanner';
import Header from './components/Header';
import Nav from './components/Nav';
import type { AppTab } from './components/Nav';
import InputForm from './components/InputForm';
import QueueCard from './components/QueueCard';
import ResultCard from './components/ResultCard';
import ErrorDisplay from './components/ErrorDisplay';
import QueueStatusBanner from './components/QueueStatusBanner';
import CollectionUpload from './components/collection/CollectionUpload';
import CollectionProgress from './components/collection/CollectionProgress';
import CollectionResults from './components/collection/CollectionResults';
import MinterFetcher from './components/minters/MinterFetcher';
import MintersResults from './components/minters/MintersResults';
import ScanHistory from './components/history/ScanHistory';
import type { AppState, JobStatusResponse, MintersResponse, MintersFields } from './types';

const QUEUE_STATUS_ENABLED = import.meta.env.VITE_QUEUE_STATUS_ENABLED === 'true';

export default function App() {
    const [tab, setTab] = useState<AppTab>('wallet');

    // ── Wallet checker ────────────────────────────────────────────────────────
    const [state, setState] = useState<AppState>({ status: 'idle' });
    const [connectivityWarning, setConnectivityWarning] = useState(false);

    const isPolling = state.status === 'polling';
    const queueStatus = useQueueStatus(QUEUE_STATUS_ENABLED && !isPolling);
    const jobId = state.status === 'polling' ? state.jobId : null;

    const handleTick = useCallback((response: JobStatusResponse) => {
        setConnectivityWarning(false);
        if (response.status === 'done') {
            setState({ status: 'done', result: response.data });
        } else if (response.status === 'queued') {
            setState(prev =>
                prev.status === 'polling'
                    ? { ...prev, pollStatus: 'queued', queuePosition: response.position }
                    : prev
            );
        } else if (response.status === 'processing') {
            setState(prev =>
                prev.status === 'polling'
                    ? { ...prev, pollStatus: 'processing', queuePosition: undefined }
                    : prev
            );
        }
    }, []);

    const handlePollError = useCallback(({ message, fatal }: { message: string; fatal: boolean }) => {
        if (fatal) {
            setState({ status: 'error', message, recoverable: true });
            setConnectivityWarning(false);
        } else {
            setConnectivityWarning(true);
        }
    }, []);

    usePoller(jobId, handleTick, handlePollError);

    async function handleSubmit(address: string) {
        setState({ status: 'submitting' });
        setConnectivityWarning(false);
        try {
            const res = await submitWallet(address);
            if ('cached' in res && res.cached) {
                setState({ status: 'done', result: res.data });
                return;
            }
            setState({ status: 'polling', jobId: res.jobId, pollStatus: 'queued', queuePosition: res.position });
        } catch (err) {
            const message =
                err instanceof NetworkError
                    ? 'Service unavailable. Please check your connection and try again.'
                    : err instanceof Error ? err.message : 'An unexpected error occurred.';
            setState({ status: 'error', message, recoverable: true });
        }
    }

    function handleReset() { setState({ status: 'idle' }); setConnectivityWarning(false); }
    function handleRetry() { setState({ status: 'idle' }); setConnectivityWarning(false); }
    function handleDismiss() { setState({ status: 'idle' }); setConnectivityWarning(false); }

    // ── Collection scanner ────────────────────────────────────────────────────
    const { state: scanState, startScan, startScanFromFile, reset: resetScan } = useCollectionScanner();
    const scanActive = scanState.phase === 'scanning';

    // ── Minter fetcher ────────────────────────────────────────────────────────
    const [mintersLoading, setMintersLoading] = useState(false);
    const [mintersError, setMintersError] = useState<string | null>(null);
    const [mintersData, setMintersData] = useState<MintersResponse | null>(null);
    const [mintersContract, setMintersContract] = useState('');
    const [mintersChain, setMintersChain] = useState(1);
    const [mintersFields, setMintersFields] = useState<MintersFields>('full');

    async function handleFetchMinters(contract: string, chain: number, fields: MintersFields) {
        setMintersLoading(true);
        setMintersError(null);
        setMintersData(null);
        setMintersContract(contract);
        setMintersChain(chain);
        setMintersFields(fields);
        try {
            const data = await getMinters(contract, chain, fields);
            setMintersData(data);
        } catch (err) {
            setMintersError(err instanceof Error ? err.message : 'Failed to fetch minters');
        } finally {
            setMintersLoading(false);
        }
    }

    function handleResetMinters() {
        setMintersData(null);
        setMintersError(null);
    }

    // "Send to Scanner" — spread the full MintersResponse (format 4 — backend handles it natively)
    function handleSendToScanner(data: MintersResponse) {
        const collectionName = mintersContract
            ? `Minters of ${mintersContract.slice(0, 8)}...`
            : 'Minter scan';
        setTab('collection');
        setTimeout(() => {
            startScan(data as unknown as Record<string, unknown>, collectionName);
        }, 150);
    }

    // ── Refresh guard while scan is running ───────────────────────────────────
    useEffect(() => {
        function onBeforeUnload(e: BeforeUnloadEvent) {
            if (scanActive && scanState.sessionId) {
                // Cancel the session server-side before the page closes
                cancelCollectionSessionBeacon(scanState.sessionId);
                e.preventDefault();
                e.returnValue = '';
            }
        }
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [scanActive, scanState.sessionId]);

    return (
        <div
            className="min-h-screen w-full flex flex-col items-center bg-spark"
            style={{ background: 'var(--color-corge-charcoal)' }}
        >
            <div className="w-full max-w-3xl px-4 flex flex-col min-h-screen">
                <div className="flex-1 flex flex-col">
                    <Header />
                    <Nav active={tab} onChange={setTab} />

                    <main className="w-full pb-16">
                        <AnimatePresence mode="wait">

                            {/* ── Wallet Checker ── */}
                            {tab === 'wallet' && (
                                <div key="wallet-tab" className="w-full">
                                    {QUEUE_STATUS_ENABLED && queueStatus && (
                                        <QueueStatusBanner
                                            queueDepth={queueStatus.queueDepth}
                                            activeJobs={queueStatus.activeJobs}
                                        />
                                    )}
                                    <AnimatePresence mode="wait">
                                        {(state.status === 'idle' || state.status === 'submitting') && (
                                            <InputForm key="input" onSubmit={handleSubmit} isLoading={state.status === 'submitting'} />
                                        )}
                                        {state.status === 'polling' && (
                                            <QueueCard key="queue" pollStatus={state.pollStatus} queuePosition={state.queuePosition} connectivityWarning={connectivityWarning} />
                                        )}
                                        {state.status === 'done' && (
                                            <ResultCard key="result" result={state.result} onReset={handleReset} />
                                        )}
                                        {state.status === 'error' && (
                                            <ErrorDisplay key="error" message={state.message} recoverable={state.recoverable} onRetry={handleRetry} onDismiss={handleDismiss} />
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}

                            {/* ── Collection Scanner ── */}
                            {tab === 'collection' && (
                                <div key="collection-tab" className="w-full flex flex-col gap-5">
                                    <AnimatePresence mode="wait">
                                        {(scanState.phase === 'idle' || scanState.phase === 'error' || scanState.phase === 'cancelled' || scanState.phase === 'uploading') && (
                                            <div key="upload">
                                                <CollectionUpload
                                                    onStartFromFile={startScanFromFile}
                                                    onStartFromAddresses={startScan}
                                                    isLoading={scanState.phase === 'uploading'}
                                                />
                                                {scanState.phase === 'error' && scanState.error && (
                                                    <div className="mt-3">
                                                        <ErrorDisplay message={scanState.error} recoverable={true} onRetry={resetScan} onDismiss={resetScan} />
                                                    </div>
                                                )}
                                                {scanState.phase === 'cancelled' && scanState.error && (
                                                    <div className="mt-3">
                                                        <ErrorDisplay message={`Session cancelled: ${scanState.error}`} recoverable={false} onDismiss={resetScan} />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {(scanState.phase === 'scanning' || scanState.phase === 'stalled') && (
                                            <CollectionProgress key="progress" state={scanState} />
                                        )}
                                        {scanState.phase === 'done' && scanState.stats && (
                                            <div key="done" className="w-full flex flex-col gap-5">
                                                <CollectionProgress state={scanState} />
                                                <CollectionResults
                                                    results={scanState.results}
                                                    stats={scanState.stats}
                                                    collectionName={scanState.collectionName}
                                                    onReset={resetScan}
                                                />
                                            </div>
                                        )}
                                        {scanState.phase === 'interrupted' && scanState.results.length > 0 && (
                                            <div key="interrupted" className="w-full flex flex-col gap-5">
                                                {/* Partial results banner */}
                                                <div
                                                    className="rounded-xl px-4 py-3"
                                                    style={{
                                                        background: 'rgba(251,191,36,0.08)',
                                                        border: '1px solid rgba(251,191,36,0.3)',
                                                    }}
                                                >
                                                    <p className="text-sm font-semibold mb-0.5" style={{ color: '#fbbf24', fontFamily: 'var(--font-body)' }}>
                                                        ⚠ Scan interrupted — partial results
                                                    </p>
                                                    <p className="text-xs" style={{ color: 'rgba(242,242,242,0.55)', fontFamily: 'var(--font-body)' }}>
                                                        {scanState.error} You can export what was collected below.
                                                    </p>
                                                </div>
                                                {scanState.stats ? (
                                                    <CollectionResults
                                                        results={scanState.results}
                                                        stats={scanState.stats}
                                                        collectionName={`${scanState.collectionName || 'Collection'} (partial)`}
                                                        onReset={resetScan}
                                                    />
                                                ) : (
                                                    /* No stats yet — show a minimal export-only panel */
                                                    <div className="glass-card p-6 flex flex-col gap-4">
                                                        <p className="text-sm" style={{ color: 'rgba(242,242,242,0.6)', fontFamily: 'var(--font-body)' }}>
                                                            {scanState.results.length.toLocaleString()} wallets scored before the session ended.
                                                        </p>
                                                        <div className="flex gap-3">
                                                            <button
                                                                onClick={() => {
                                                                    const header = 'wallet,wallet_score,label,is_sweeper,flip_count,confidence';
                                                                    const rows = scanState.results.map(r =>
                                                                        `${r.wallet},${r.wallet_score},${r.label},${r.is_sweeper},${r.flip_count},${r.confidence}`
                                                                    );
                                                                    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
                                                                    const a = document.createElement('a');
                                                                    a.href = URL.createObjectURL(blob);
                                                                    a.download = `${scanState.collectionName || 'collection'}_partial.csv`;
                                                                    a.click();
                                                                }}
                                                                className="text-xs px-4 py-2 rounded-lg"
                                                                style={{
                                                                    background: 'var(--color-corge-orange)',
                                                                    color: '#fff',
                                                                    border: 'none',
                                                                    fontFamily: 'var(--font-body)',
                                                                    fontWeight: 600,
                                                                    cursor: 'pointer',
                                                                }}
                                                            >
                                                                ↓ Export partial CSV
                                                            </button>
                                                            <button
                                                                onClick={resetScan}
                                                                className="text-xs px-4 py-2 rounded-lg"
                                                                style={{
                                                                    background: 'transparent',
                                                                    border: '1px solid var(--glass-border)',
                                                                    color: 'rgba(242,242,242,0.5)',
                                                                    fontFamily: 'var(--font-body)',
                                                                    cursor: 'pointer',
                                                                }}
                                                            >
                                                                New scan
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}

                            {/* ── Minter Fetcher ── */}
                            {tab === 'minters' && (
                                <div key="minters-tab" className="w-full flex flex-col gap-5">
                                    <AnimatePresence mode="wait">
                                        {!mintersData && (
                                            <MinterFetcher
                                                key="fetcher"
                                                onFetch={handleFetchMinters}
                                                isLoading={mintersLoading}
                                                error={mintersError}
                                            />
                                        )}
                                        {mintersData && (
                                            <MintersResults
                                                key="results"
                                                data={mintersData}
                                                contract={mintersContract}
                                                chain={mintersChain}
                                                fields={mintersFields}
                                                onReset={handleResetMinters}
                                                onSendToScanner={handleSendToScanner}
                                            />
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}

                            {/* ── Scan History ── */}
                            {tab === 'history' && (
                                <div key="history-tab" className="w-full">
                                    <ScanHistory />
                                </div>
                            )}

                        </AnimatePresence>
                    </main>
                </div>
            </div>
        </div>
    );
}

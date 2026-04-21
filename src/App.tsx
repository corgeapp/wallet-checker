import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { submitWallet } from './api/client';
import { NetworkError } from './api/client';
import { usePoller } from './hooks/usePoller';
import { useQueueStatus } from './hooks/useQueueStatus';
import Header from './components/Header';
import InputForm from './components/InputForm';
import QueueCard from './components/QueueCard';
import ResultCard from './components/ResultCard';
import ErrorDisplay from './components/ErrorDisplay';
import QueueStatusBanner from './components/QueueStatusBanner';
import type { AppState, JobStatusResponse } from './types';

const QUEUE_STATUS_ENABLED = import.meta.env.VITE_QUEUE_STATUS_ENABLED === 'true';

export default function App() {
    const [state, setState] = useState<AppState>({ status: 'idle' });
    const [connectivityWarning, setConnectivityWarning] = useState(false);

    // Queue status banner — only active when not polling
    const isPolling = state.status === 'polling';
    const queueStatus = useQueueStatus(QUEUE_STATUS_ENABLED && !isPolling);
    // Derive jobId for the poller — only active while polling
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
            const { jobId: newJobId } = await submitWallet(address);
            setState({ status: 'polling', jobId: newJobId, pollStatus: 'queued' });
        } catch (err) {
            const message =
                err instanceof NetworkError
                    ? 'Service unavailable. Please check your connection and try again.'
                    : err instanceof Error
                        ? err.message
                        : 'An unexpected error occurred.';
            setState({ status: 'error', message, recoverable: true });
        }
    }

    function handleReset() {
        setState({ status: 'idle' });
        setConnectivityWarning(false);
    }

    function handleRetry() {
        setState({ status: 'idle' });
        setConnectivityWarning(false);
    }

    function handleDismiss() {
        setState({ status: 'idle' });
        setConnectivityWarning(false);
    }

    return (
        <div
            className="min-h-screen w-full flex flex-col items-center bg-spark"
            style={{ background: 'var(--color-corge-charcoal)' }}
        >
            <div className="w-full max-w-3xl px-4 flex flex-col min-h-screen">
                <div className="flex-1 flex flex-col" >
                    <Header />
                    <main className="w-full">
                        {QUEUE_STATUS_ENABLED && queueStatus && (
                            <QueueStatusBanner
                                queueDepth={queueStatus.queueDepth}
                                activeJobs={queueStatus.activeJobs}
                            />
                        )}
                        <AnimatePresence mode="wait">
                            {(state.status === 'idle' || state.status === 'submitting') && (
                                <InputForm
                                    key="input"
                                    onSubmit={handleSubmit}
                                    isLoading={state.status === 'submitting'}
                                />
                            )}

                            {state.status === 'polling' && (
                                <QueueCard
                                    key="queue"
                                    pollStatus={state.pollStatus}
                                    queuePosition={state.queuePosition}
                                    connectivityWarning={connectivityWarning}
                                />
                            )}

                            {state.status === 'done' && (
                                <ResultCard
                                    key="result"
                                    result={state.result}
                                    onReset={handleReset}
                                />
                            )}

                            {state.status === 'error' && (
                                <ErrorDisplay
                                    key="error"
                                    message={state.message}
                                    recoverable={state.recoverable}
                                    onRetry={handleRetry}
                                    onDismiss={handleDismiss}
                                />
                            )}
                        </AnimatePresence>
                    </main>
                </div>
            </div>
        </div>
    );
}

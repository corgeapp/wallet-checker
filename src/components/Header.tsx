import { useState } from 'react';
import logostar from '../assets/logostar.svg';
import { getApiKey, setApiKey, clearApiKey, hasApiKey } from '../utils/apiKey';

interface HeaderProps {
    isAuthenticated?: boolean;
}

export default function Header({ isAuthenticated }: HeaderProps) {
    const [showApiKeyModal, setShowApiKeyModal] = useState(false);
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [isAdmin, setIsAdmin] = useState(hasApiKey());

    function handleSaveApiKey() {
        if (apiKeyInput.trim()) {
            setApiKey(apiKeyInput.trim());
            setIsAdmin(true);
            setShowApiKeyModal(false);
            setApiKeyInput('');
            // Reload to apply API key to all requests
            window.location.reload();
        }
    }

    function handleRemoveApiKey() {
        clearApiKey();
        setIsAdmin(false);
        setShowApiKeyModal(false);
        // Reload to remove API key from requests
        window.location.reload();
    }

    function handleOpenModal() {
        setApiKeyInput(getApiKey() || '');
        setShowApiKeyModal(true);
    }

    return (
        <>
            <header className="w-full flex flex-col items-center gap-3 pt-10 pb-6 relative">
                {/* API Key Settings Button - Only visible when authenticated via /pass */}
                {isAuthenticated && (
                    <button
                        onClick={handleOpenModal}
                        className="absolute top-10 right-0 text-xs px-3 py-2 rounded-lg transition-all"
                        style={{
                            background: isAdmin ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.06)',
                            border: `1px solid ${isAdmin ? 'rgba(52,211,153,0.3)' : 'var(--glass-border)'}`,
                            color: isAdmin ? '#34d399' : 'rgba(242,242,242,0.5)',
                            fontFamily: 'var(--font-body)',
                            cursor: 'pointer',
                        }}
                        title={isAdmin ? 'Admin mode active' : 'Set API key'}
                    >
                        {isAdmin ? '🔑 Admin' : '⚙️ API Key'}
                    </button>
                )}

                <img
                    src={logostar}
                    alt="Corge logo"
                    data-testid="corge-logo"
                    className="w-10 h-10"
                />
                <h1
                    className="text-2xl md:text-3xl font-bold tracking-tight text-center"
                    style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-corge-offwhite, #F2F2F2)' }}
                >
                    Jeet Checker
                </h1>
                <p
                    data-testid="tagline"
                    className="text-sm tracking-widest uppercase"
                    style={{ fontFamily: 'var(--font-body)', color: 'rgba(242,242,242,0.5)', letterSpacing: '0.15em' }}
                >
                    Reputation is the new capital
                </p>
            </header>

            {/* API Key Modal */}
            {showApiKeyModal && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.85)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                    }}
                    onClick={() => setShowApiKeyModal(false)}
                >
                    <div
                        className="glass-card"
                        style={{
                            maxWidth: '400px',
                            width: '90%',
                            padding: '2rem',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2
                            style={{
                                fontFamily: 'var(--font-heading)',
                                color: 'var(--color-corge-offwhite)',
                                fontSize: '1.25rem',
                                marginBottom: '0.5rem',
                            }}
                        >
                            Admin API Key
                        </h2>
                        <p
                            style={{
                                fontSize: '0.875rem',
                                color: 'rgba(242,242,242,0.5)',
                                fontFamily: 'var(--font-body)',
                                marginBottom: '1rem',
                            }}
                        >
                            Enter your admin API key for unlimited requests
                        </p>
                        <input
                            type="password"
                            value={apiKeyInput}
                            onChange={(e) => setApiKeyInput(e.target.value)}
                            placeholder="Enter API key"
                            autoFocus
                            className="focus-orange w-full rounded-lg px-4 py-3 text-sm outline-none mb-3"
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--glass-border)',
                                color: 'var(--color-corge-offwhite)',
                                fontFamily: 'monospace',
                                minHeight: '44px',
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveApiKey();
                            }}
                        />
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <button
                                onClick={handleSaveApiKey}
                                disabled={!apiKeyInput.trim()}
                                style={{
                                    flex: 1,
                                    background: apiKeyInput.trim() ? 'var(--color-corge-orange)' : 'rgba(255,90,31,0.3)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '0.5rem',
                                    padding: '0.75rem',
                                    fontFamily: 'var(--font-body)',
                                    fontWeight: 600,
                                    cursor: apiKeyInput.trim() ? 'pointer' : 'not-allowed',
                                    minHeight: '44px',
                                }}
                            >
                                Save
                            </button>
                            {isAdmin && (
                                <button
                                    onClick={handleRemoveApiKey}
                                    style={{
                                        background: 'rgba(248,113,113,0.15)',
                                        border: '1px solid rgba(248,113,113,0.3)',
                                        color: '#f87171',
                                        borderRadius: '0.5rem',
                                        padding: '0.75rem 1.5rem',
                                        fontFamily: 'var(--font-body)',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Remove
                                </button>
                            )}
                            <button
                                onClick={() => setShowApiKeyModal(false)}
                                style={{
                                    background: 'transparent',
                                    border: '1px solid var(--glass-border)',
                                    color: 'rgba(242,242,242,0.5)',
                                    borderRadius: '0.5rem',
                                    padding: '0.75rem 1.5rem',
                                    fontFamily: 'var(--font-body)',
                                    cursor: 'pointer',
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

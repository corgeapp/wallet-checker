export type AppTab = 'wallet' | 'collection' | 'minters' | 'history';

interface Props {
    active: AppTab;
    onChange: (tab: AppTab) => void;
}

const TABS: { id: AppTab; label: string }[] = [
    { id: 'wallet', label: 'Wallet Checker' },
    { id: 'collection', label: 'Collection Scanner' },
    { id: 'minters', label: 'Minter Fetcher' },
    { id: 'history', label: 'History' },
];

export default function Nav({ active, onChange }: Props) {
    return (
        <div
            className="flex gap-1 p-1 rounded-xl mb-6 w-fit mx-auto flex-wrap justify-center"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)' }}
        >
            {TABS.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                    style={{
                        background: active === tab.id ? 'var(--color-corge-orange)' : 'transparent',
                        color: active === tab.id ? '#fff' : 'rgba(242,242,242,0.5)',
                        fontFamily: 'var(--font-body)',
                        border: 'none',
                        cursor: 'pointer',
                        minHeight: '36px',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}

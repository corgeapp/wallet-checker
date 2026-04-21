import logostar from '../assets/logostar.svg';

export default function Header() {
    return (
        <header className="w-full flex flex-col items-center gap-3 pt-10 pb-6">
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
    );
}

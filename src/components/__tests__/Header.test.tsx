import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Header from '../Header';

describe('Header', () => {
    it('renders the logo image', () => {
        render(<Header />);
        expect(screen.getByTestId('corge-logo')).toBeInTheDocument();
    });

    it('renders the tagline', () => {
        render(<Header />);
        expect(screen.getByTestId('tagline')).toHaveTextContent('Reputation is the new capital');
    });
});

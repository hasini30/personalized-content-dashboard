import React from 'react';
import { render, screen } from '@testing-library/react';
import { Spinner } from '@/components/ui/Spinner';

describe('Spinner Component', () => {
  it('renders with default accessibility role and label', () => {
    render(<Spinner />);
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-label', 'Loading...');
  });

  it('renders different size variants and custom label', () => {
    const { rerender } = render(<Spinner size="sm" label="Fetching data" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Fetching data');

    rerender(<Spinner size="lg" label="Saving" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Saving');
  });
});

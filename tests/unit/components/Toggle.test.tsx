import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toggle } from '@/components/ui/Toggle';

describe('Toggle component', () => {
  it('renders switch with label and toggles checked state', () => {
    const handleChange = jest.fn();
    render(<Toggle label="Auto-refresh" checked={false} onChange={handleChange} />);

    expect(screen.getByText('Auto-refresh')).toBeInTheDocument();
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(toggle);
    expect(handleChange).toHaveBeenCalledWith(true);
  });
});

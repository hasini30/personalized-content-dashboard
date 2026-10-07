import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from '@/components/ui/EmptyState';

describe('EmptyState Component', () => {
  it('renders default empty state message', () => {
    render(<EmptyState />);
    expect(screen.getByText('No content found')).toBeInTheDocument();
    expect(
      screen.getByText('Try adjusting your filters, categories, or search term.')
    ).toBeInTheDocument();
  });

  it('renders custom title, description, and action button with callback', () => {
    const onActionMock = jest.fn();
    render(
      <EmptyState
        title="Custom Title"
        description="Custom Description"
        actionLabel="Click Here"
        onAction={onActionMock}
      />
    );

    expect(screen.getByText('Custom Title')).toBeInTheDocument();
    expect(screen.getByText('Custom Description')).toBeInTheDocument();

    const button = screen.getByRole('button', { name: 'Click Here' });
    fireEvent.click(button);
    expect(onActionMock).toHaveBeenCalledTimes(1);
  });
});

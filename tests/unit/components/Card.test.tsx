import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/Card';

describe('Card Component Suite', () => {
  it('renders Card with header, title, description, content, and footer', () => {
    render(
      <Card data-testid="card-root" className="custom-card">
        <CardHeader data-testid="card-header">
          <CardTitle>Test Title</CardTitle>
          <CardDescription>Test Description</CardDescription>
        </CardHeader>
        <CardContent data-testid="card-content">
          <p>Main Card Body Content</p>
        </CardContent>
        <CardFooter data-testid="card-footer">
          <button>Card Action</button>
        </CardFooter>
      </Card>
    );

    const card = screen.getByTestId('card-root');
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass('custom-card');

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('Main Card Body Content')).toBeInTheDocument();
    expect(screen.getByText('Card Action')).toBeInTheDocument();
  });
});

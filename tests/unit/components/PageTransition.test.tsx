import React from 'react';
import { render, screen } from '@testing-library/react';
import { PageTransition } from '@/components/ui/PageTransition';

let mockReducedMotion = false;
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className}>{children}</div>
    ),
  },
  useReducedMotion: () => mockReducedMotion,
}));

describe('PageTransition Component', () => {
  beforeEach(() => {
    mockReducedMotion = false;
  });

  it('renders children with normal motion wrapper', () => {
    render(
      <PageTransition className="test-transition">
        <span>Transition Content</span>
      </PageTransition>
    );

    expect(screen.getByText('Transition Content')).toBeInTheDocument();
  });

  it('renders standard div fallback when reduced motion is preferred', () => {
    mockReducedMotion = true;
    render(
      <PageTransition className="reduced-motion">
        <span>Accessible Content</span>
      </PageTransition>
    );

    expect(screen.getByText('Accessible Content')).toBeInTheDocument();
  });
});

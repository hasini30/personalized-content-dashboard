import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils';
import { AppLayout } from '@/components/layout/AppLayout';

jest.mock('@/components/layout/Header', () => ({
  Header: () => <header data-testid="app-header">Header</header>,
}));

jest.mock('@/components/layout/Sidebar', () => ({
  Sidebar: () => <aside data-testid="app-sidebar">Sidebar</aside>,
}));

describe('AppLayout Component', () => {
  it('renders Header, Sidebar, and wraps children inside main content region', () => {
    renderWithProviders(
      <AppLayout>
        <div data-testid="child-content">Main Page Content</div>
      </AppLayout>
    );

    expect(screen.getByTestId('app-header')).toBeInTheDocument();
    expect(screen.getByTestId('app-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });
});

import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils';
import { Header } from '@/components/layout/Header';

const mockSignOut = jest.fn();
let mockSessionData: { user?: { id: string; name: string; email: string } } | null = null;

jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: mockSessionData }),
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

jest.mock('@/components/layout/LanguageSwitcher', () => ({
  LanguageSwitcher: () => <div data-testid="language-switcher" />,
}));

jest.mock('@/components/layout/ThemeToggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

describe('Header Component', () => {
  beforeEach(() => {
    mockSessionData = null;
    mockSignOut.mockClear();
  });

  it('renders branding, search input, and unauthenticated login button', () => {
    const { store } = renderWithProviders(<Header />);

    expect(screen.getByText('FeedPulse')).toBeInTheDocument();
    const searchInput = screen.getByRole('searchbox', { name: /search content/i });
    expect(searchInput).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'quantum' } });
    expect(store.getState().feed.searchQuery).toBe('quantum');

    expect(screen.getByRole('link', { name: /login/i })).toBeInTheDocument();
  });

  it('triggers mobile menu toggle when hamburger button is clicked', () => {
    const onMobileMenuToggle = jest.fn();
    renderWithProviders(<Header onMobileMenuToggle={onMobileMenuToggle} />);

    const menuBtn = screen.getByRole('button', { name: /open navigation sidebar/i });
    fireEvent.click(menuBtn);
    expect(onMobileMenuToggle).toHaveBeenCalledTimes(1);
  });

  it('displays live updates pill when liveUpdatesCount > 0 and handles click', () => {
    const onApplyLiveUpdates = jest.fn();
    renderWithProviders(<Header liveUpdatesCount={4} onApplyLiveUpdates={onApplyLiveUpdates} />);

    const pill = screen.getByRole('button', { name: /4 new/i });
    expect(pill).toBeInTheDocument();

    fireEvent.click(pill);
    expect(onApplyLiveUpdates).toHaveBeenCalledTimes(1);
  });

  it('renders logged-in user profile link and sign-out button', () => {
    mockSessionData = {
      user: {
        id: 'user-1',
        name: 'Alex Rivera',
        email: 'alex@example.com',
      },
    };

    renderWithProviders(<Header />);
    expect(screen.getByText('Alex Rivera')).toBeInTheDocument();

    const signOutBtn = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(signOutBtn);
    expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: '/' });
  });
});

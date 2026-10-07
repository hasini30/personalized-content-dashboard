import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils';
import ProfilePage from '@/app/(dashboard)/profile/page';
import { useSession, signOut } from 'next-auth/react';

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/profile',
}));

describe('ProfilePage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders sign in prompt when unauthenticated', () => {
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    });

    renderWithProviders(<ProfilePage />);

    expect(screen.getByRole('heading', { name: /sign in to view profile/i })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /login/i }).length).toBeGreaterThan(0);
  });

  it('renders user details and activity stats when authenticated', () => {
    (useSession as jest.Mock).mockReturnValue({
      data: {
        user: {
          id: 'user-1',
          name: 'Alex Rivera',
          email: 'alex@example.com',
          role: 'Senior Software Architect',
          bio: 'Building scalable event-driven systems.',
          image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        },
      },
      status: 'authenticated',
      update: jest.fn(),
    });

    renderWithProviders(<ProfilePage />, {
      preloadedState: {
        favorites: {
          items: [
            {
              id: 'fav-1',
              source: 'news',
              title: 'Fav News',
              publishedAt: '2026-10-01T00:00:00Z',
              url: 'https://example.com/fav',
            },
          ],
        },
        preferences: {
          categories: ['technology', 'business'],
          movieGenres: ['Action'],
          autoRefreshInterval: 30,
          feedScope: 'forYou',
          contentLanguage: 'en',
        },
      },
    });

    expect(screen.getByRole('heading', { name: 'Alex Rivera' })).toBeInTheDocument();
    expect(screen.getByText('Senior Software Architect')).toBeInTheDocument();
    expect(screen.getByText('alex@example.com')).toBeInTheDocument();
    expect(screen.getByText('Building scalable event-driven systems.')).toBeInTheDocument();

    // Stats cards
    expect(screen.getByText('Saved Offline')).toBeInTheDocument();
    expect(screen.getAllByText('1').length).toBeGreaterThan(0); // favoritesCount
    expect(screen.getAllByText('Active Topics').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2').length).toBeGreaterThan(0); // 2 topics
    expect(screen.getByText('Verified Session')).toBeInTheDocument();
  });

  it('allows customizing profile details and saving changes', async () => {
    const mockUpdate = jest.fn().mockResolvedValue({});

    (useSession as jest.Mock).mockReturnValue({
      data: {
        user: {
          id: 'user-1',
          name: 'Alex Rivera',
          email: 'alex@example.com',
          role: 'Senior Software Architect',
          bio: 'Building systems.',
        },
      },
      status: 'authenticated',
      update: mockUpdate,
    });

    const { store } = renderWithProviders(<ProfilePage />, {
      preloadedState: {
        preferences: {
          categories: ['technology'],
          movieGenres: ['Action'],
          autoRefreshInterval: 30,
          feedScope: 'forYou',
          contentLanguage: 'en',
        },
      },
    });

    // Enter edit mode
    const editBtn = screen.getByRole('button', { name: /customize profile/i });
    fireEvent.click(editBtn);

    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/headline \/ role/i)).toBeInTheDocument();

    // Change fields
    fireEvent.change(screen.getByLabelText(/display name/i), {
      target: { value: 'Alex Rivera Updated' },
    });
    fireEvent.change(screen.getByLabelText(/headline \/ role/i), {
      target: { value: 'Principal Architect' },
    });

    // Select topic chip
    const scienceChip = screen.getByRole('button', { name: /science/i });
    fireEvent.click(scienceChip);

    // Save profile
    const saveBtn = screen.getByRole('button', { name: /save profile/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        user: expect.objectContaining({
          name: 'Alex Rivera Updated',
          role: 'Principal Architect',
        }),
      });
      // Check Redux preferences updated
      expect(store.getState().preferences.categories).toContain('science');
      expect(store.getState().preferences.categories).toContain('technology');
      // Success feedback displayed
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(
        screen.getByText(/profile and preferences updated successfully!/i)
      ).toBeInTheDocument();
    });
  });

  it('triggers signOut when sign out button is clicked', () => {
    (useSession as jest.Mock).mockReturnValue({
      data: {
        user: {
          id: 'user-1',
          name: 'Alex Rivera',
          email: 'alex@example.com',
        },
      },
      status: 'authenticated',
      update: jest.fn(),
    });

    renderWithProviders(<ProfilePage />);

    const signOutBtns = screen.getAllByRole('button', { name: /sign out/i });
    fireEvent.click(signOutBtns[signOutBtns.length - 1]);

    expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/' });
  });
});

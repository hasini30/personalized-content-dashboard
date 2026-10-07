import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils';
import LoginPage from '@/app/(auth)/login/page';
import { signIn } from 'next-auth/react';

const mockPush = jest.fn();
const mockRefresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  useSearchParams: () => ({
    get: (key: string) => (key === 'callbackUrl' ? '/dashboard' : null),
  }),
}));

jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
}));

describe('LoginPage Component', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/api/auth/register')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'User registered successfully' }),
        } as unknown as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as unknown as Response);
    });
  });

  it('renders Sign In view by default with inputs and fast-track demo buttons', () => {
    renderWithProviders(<LoginPage />);

    expect(screen.getByRole('heading', { name: /sign in to your account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByText(/Alex Rivera/i)).toBeInTheDocument();
    expect(screen.getByText(/Priya Sharma/i)).toBeInTheDocument();
  });

  it('allows switching between Sign In and Sign Up tabs', () => {
    renderWithProviders(<LoginPage />);

    const signUpTab = screen.getByTestId('signup-tab');
    fireEvent.click(signUpTab);

    expect(
      screen.getByRole('heading', { name: /create your feedpulse account/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/headline \/ role/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/bio/i)).toBeInTheDocument();

    const signInTab = screen.getByTestId('signin-tab');
    fireEvent.click(signInTab);

    expect(screen.getByRole('heading', { name: /sign in to your account/i })).toBeInTheDocument();
  });

  it('handles sign in submission with success', async () => {
    (signIn as jest.Mock).mockResolvedValueOnce({ ok: true, error: null });

    renderWithProviders(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'alex@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });

    const submitBtn = screen.getByTestId('signin-submit-button');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith('credentials', {
        email: 'alex@example.com',
        password: 'password123',
        redirect: false,
        callbackUrl: '/dashboard',
      });
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('handles sign in error and displays alert', async () => {
    (signIn as jest.Mock).mockResolvedValueOnce({ ok: false, error: 'CredentialsSignin' });

    renderWithProviders(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'wrong@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'wrongpass' },
    });

    const submitBtn = screen.getByTestId('signin-submit-button');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  it('validates password length on signup', async () => {
    renderWithProviders(<LoginPage />);

    const signUpTab = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(signUpTab);

    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: 'Test User' },
    });
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: '123' },
    });

    const createBtn = screen.getByTestId('signup-submit-button');
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 6 characters long/i)).toBeInTheDocument();
    });
  });

  it('completes signup and signs the user in', async () => {
    (signIn as jest.Mock).mockResolvedValueOnce({ ok: true, error: null });

    renderWithProviders(<LoginPage />);

    const signUpTab = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(signUpTab);

    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: 'Sam Wilson' },
    });
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'sam.wilson@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'securepassword123' },
    });
    fireEvent.change(screen.getByLabelText(/headline \/ role/i), {
      target: { value: 'News Analyst' },
    });

    const createBtn = screen.getByTestId('signup-submit-button');
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith('credentials', {
        email: 'sam.wilson@example.com',
        password: 'securepassword123',
        redirect: false,
        callbackUrl: '/dashboard',
      });
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('handles quick login buttons for demo accounts', async () => {
    (signIn as jest.Mock).mockResolvedValueOnce({ ok: true, error: null });

    renderWithProviders(<LoginPage />);

    const alexBtn = screen.getByText(/Alex Rivera/i);
    fireEvent.click(alexBtn);

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith('credentials', {
        email: 'alex@example.com',
        password: 'password123',
        redirect: false,
        callbackUrl: '/dashboard',
      });
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });
});

import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { renderWithProviders } from '../../test-utils';

const mockChangeLanguage = jest.fn();

jest.mock('react-i18next', () => {
  const actual = jest.requireActual('react-i18next');
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
      i18n: {
        language: 'en',
        changeLanguage: mockChangeLanguage,
      },
    }),
  };
});

describe('LanguageSwitcher Component', () => {
  beforeEach(() => {
    mockChangeLanguage.mockClear();
  });

  it('renders language select dropdown strictly with the 11 supported Indian languages and English', () => {
    renderWithProviders(<LanguageSwitcher />);
    const select = screen.getByLabelText(/select language/i);
    expect(select).toBeInTheDocument();

    // Verify all Indian languages + English exist
    expect(screen.getByRole('option', { name: /en - english/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /hi - हिन्दी/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /te - తెలుగు/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /ta - தமிழ்/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /mr - मराठी/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /gu - ગુજરાતી/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /kn - ಕನ್ನಡ/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /bn - বাংলা/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /ml - മലയാളം/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /pa - ਪੰਜਾਬੀ/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /ur - اردو/i })).toBeInTheDocument();

    // Verify non-Indian languages were removed
    expect(screen.queryByRole('option', { name: /es - español/i })).toBeNull();
    expect(screen.queryByRole('option', { name: /fr - français/i })).toBeNull();
    expect(screen.queryByRole('option', { name: /de - deutsch/i })).toBeNull();
    expect(screen.queryByRole('option', { name: /ja - 日本語/i })).toBeNull();
    expect(screen.queryByRole('option', { name: /zh - 中文/i })).toBeNull();
  });

  it('calls changeLanguage and updates Redux contentLanguage when user selects another language', () => {
    const { store } = renderWithProviders(<LanguageSwitcher />);
    const select = screen.getByLabelText(/select language/i);

    fireEvent.change(select, { target: { value: 'te' } });
    expect(mockChangeLanguage).toHaveBeenCalledWith('te');
    expect(store.getState().preferences.contentLanguage).toBe('te');

    fireEvent.change(select, { target: { value: 'hi' } });
    expect(mockChangeLanguage).toHaveBeenCalledWith('hi');
    expect(store.getState().preferences.contentLanguage).toBe('hi');

    fireEvent.change(select, { target: { value: 'ur' } });
    expect(mockChangeLanguage).toHaveBeenCalledWith('ur');
    expect(store.getState().preferences.contentLanguage).toBe('ur');
  });
});

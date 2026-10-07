'use client';

import * as React from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n/config';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      if (typeof document !== 'undefined') {
        document.documentElement.lang = lng;
        document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
      }
    };

    i18n.on('languageChanged', handleLanguageChanged);
    handleLanguageChanged(i18n.language || 'en');

    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

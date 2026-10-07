'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '@/lib/languages';
import { useAppDispatch } from '@/store/hooks';
import { setContentLanguage } from '@/features/preferences/preferencesSlice';

export const LANGUAGES = SUPPORTED_LANGUAGES.map((lang) => ({
  code: lang.code,
  label: `${lang.nativeName} (${lang.name})`,
  short: lang.short,
}));

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const [currentLng, setCurrentLng] = React.useState('en');
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    setCurrentLng(i18n.language || 'en');
  }, [i18n.language]);

  const handleChange = (code: string) => {
    i18n.changeLanguage(code);
    setCurrentLng(code);
    dispatch(setContentLanguage(code));
    if (typeof window !== 'undefined') {
      localStorage.setItem('i18nextLng', code);
      const isRtl = code === 'ur';
      document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
      document.documentElement.lang = code;
    }
  };

  if (!mounted) {
    return <div className="h-9 w-24 rounded-lg border border-border bg-card/50" />;
  }

  return (
    <div className={`relative flex items-center ${className}`}>
      <label htmlFor="language-select" className="sr-only">
        Select Language
      </label>
      <div className="flex items-center gap-1.5 px-2.5 h-9 rounded-lg border border-border bg-card text-foreground hover:bg-muted text-xs font-semibold focus-within:ring-2 focus-within:ring-ring">
        <Languages className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <select
          id="language-select"
          value={currentLng}
          onChange={(e) => handleChange(e.target.value)}
          className="bg-transparent text-xs font-medium text-foreground cursor-pointer focus:outline-none pr-1 max-w-[160px]"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code} className="bg-card text-foreground">
              {lang.short} - {lang.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

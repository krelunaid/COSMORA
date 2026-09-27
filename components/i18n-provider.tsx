'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  defaultLocale,
  readLocalePreference,
  resolveLocale,
  saveLocalePreference,
  type Locale,
} from '@/lib/i18n/config';
import { messages } from '@/lib/i18n/messages';

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  messages: (typeof messages)[Locale];
};
const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, updateLocale] = useState<Locale>(defaultLocale);
  const manualChoice = useRef<Locale | null>(null);
  useEffect(() => {
    manualChoice.current = readLocalePreference(() => window.localStorage);
    const detect = () =>
      updateLocale(
        resolveLocale(
          manualChoice.current,
          navigator.languages?.length
            ? navigator.languages
            : [navigator.language],
        ),
      );
    detect();
    window.addEventListener('languagechange', detect);
    return () => window.removeEventListener('languagechange', detect);
  }, []);
  const setLocale = useCallback((next: Locale) => {
    manualChoice.current = next;
    saveLocalePreference(next, () => window.localStorage);
    updateLocale(next);
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const value = useMemo(
    () => ({ locale, setLocale, messages: messages[locale] }),
    [locale, setLocale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}

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
import {
  LanguageStartup,
  LanguageWelcome,
} from '@/components/language-welcome';

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  messages: (typeof messages)[Locale];
};
const I18nContext = createContext<I18nContextValue | null>(null);
// Retain a confirmed choice for this app session if browser storage is denied.
let sessionLocaleChoice: Locale | null = null;

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, updateLocale] = useState<Locale>(defaultLocale);
  const [startup, setStartup] = useState<'loading' | 'choose' | 'ready'>(
    'loading',
  );
  const manualChoice = useRef<Locale | null>(null);
  const pendingChoice = useRef<Locale | null>(null);
  useEffect(() => {
    manualChoice.current =
      readLocalePreference(() => window.localStorage) ?? sessionLocaleChoice;
    if (manualChoice.current) sessionLocaleChoice = manualChoice.current;
    const detect = () =>
      updateLocale(
        resolveLocale(
          manualChoice.current ?? pendingChoice.current,
          navigator.languages?.length
            ? navigator.languages
            : [navigator.language],
        ),
      );
    detect();
    setStartup(manualChoice.current ? 'ready' : 'choose');
    window.addEventListener('languagechange', detect);
    return () => window.removeEventListener('languagechange', detect);
  }, []);
  const setLocale = useCallback((next: Locale) => {
    manualChoice.current = next;
    sessionLocaleChoice = next;
    saveLocalePreference(next, () => window.localStorage);
    updateLocale(next);
  }, []);
  const chooseLocale = useCallback((next: Locale) => {
    pendingChoice.current = next;
    updateLocale(next);
  }, []);
  const confirmLocale = useCallback(() => {
    setLocale(locale);
    setStartup('ready');
  }, [locale, setLocale]);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const value = useMemo(
    () => ({ locale, setLocale, messages: messages[locale] }),
    [locale, setLocale],
  );
  return (
    <I18nContext.Provider value={value}>
      {startup === 'loading' ? (
        <LanguageStartup locale={locale} />
      ) : startup === 'choose' ? (
        <LanguageWelcome
          locale={locale}
          onLocaleChange={chooseLocale}
          onContinue={confirmLocale}
        />
      ) : (
        children
      )}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}

'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { defaultLocale, isLocale, type Locale } from '@/lib/i18n/config';
import { messages } from '@/lib/i18n/messages';

type I18nContextValue = { locale: Locale; setLocale: (locale: Locale) => void; messages: (typeof messages)[Locale] };
const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, updateLocale] = useState<Locale>(defaultLocale);
  useEffect(() => {
    const saved = localStorage.getItem('cosmora_locale');
    const device = navigator.language.toLowerCase().split('-')[0];
    const detected = saved && isLocale(saved) ? saved : isLocale(device) ? device : defaultLocale;
    const timer = window.setTimeout(() => updateLocale(detected), 0);
    return () => window.clearTimeout(timer);
  }, []);
  function setLocale(next: Locale) {
    localStorage.setItem('cosmora_locale', next);
    document.documentElement.lang = next;
    updateLocale(next);
  }
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  const value = useMemo(() => ({ locale, setLocale, messages: messages[locale] }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}

export const supportedLocales = ['en', 'it', 'fr', 'de', 'es'] as const;

export type Locale = (typeof supportedLocales)[number];

export const defaultLocale: Locale = 'en';

export const localeLabels: Record<Locale, string> = {
  en: 'English',
  it: 'Italiano',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
};

export function isLocale(value: string): value is Locale {
  return supportedLocales.includes(value as Locale);
}

/** Prefer a saved app choice, then the first supported device language. */
export function resolveLocale(
  saved: string | null | undefined,
  languages: readonly string[] = [],
): Locale {
  if (saved && isLocale(saved)) return saved;
  for (const language of languages) {
    const base = language.trim().toLowerCase().split(/[-_]/)[0];
    if (isLocale(base)) return base;
  }
  return defaultLocale;
}

const localeStorageKey = 'cosmora_locale';
type LocaleStorage = Pick<Storage, 'getItem' | 'setItem'>;

// Safari privacy settings and embedded webviews may deny storage entirely.
export function readLocalePreference(
  getStorage: () => LocaleStorage,
): Locale | null {
  try {
    const value = getStorage().getItem(localeStorageKey);
    return value && isLocale(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveLocalePreference(
  locale: Locale,
  getStorage: () => LocaleStorage,
): void {
  try {
    getStorage().setItem(localeStorageKey, locale);
  } catch {
    /* Keep the choice for this session. */
  }
}

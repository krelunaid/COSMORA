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

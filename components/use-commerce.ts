'use client';
import { useMemo } from 'react';
import { useI18n } from './i18n-provider';
import {
  commerceText,
  commerceCategory,
  type CommerceKey,
} from '@/lib/i18n/commerce';

export function useCommerce() {
  const { locale } = useI18n();
  return useMemo(
    () => ({
      locale,
      t: (key: CommerceKey) => commerceText(locale, key),
      categoryLabel: (key: string) => commerceCategory(locale, key),
      euro: (cents: number) =>
        new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: 'EUR',
        }).format(cents / 100),
    }),
    [locale],
  );
}

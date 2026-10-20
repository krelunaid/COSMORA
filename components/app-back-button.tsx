'use client';
import { useI18n } from '@/components/i18n-provider';
import { accountMessages } from '@/lib/i18n/account';

import { useRouter } from 'next/navigation';

export function AppBackButton({
  fallback = '/',
  className = '',
}: {
  fallback?: string;
  className?: string;
}) {
  const router = useRouter();
  const { locale } = useI18n();

  function goBack() {
    // Referrer does not track client-side route changes. Explicit section
    // destinations remain reliable after a deep link, reload or OAuth return.
    router.replace(fallback);
  }

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label={accountMessages[locale].back}
      className={`grid size-11 touch-manipulation place-items-center rounded-full text-3xl leading-none active:bg-white/8 ${className}`}
    >
      &#8249;
    </button>
  );
}

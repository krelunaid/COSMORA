'use client';

import { useRouter } from 'next/navigation';

export function AppBackButton({
  fallback = '/',
  className = '',
}: {
  fallback?: string;
  className?: string;
}) {
  const router = useRouter();

  function goBack() {
    if (document.referrer) {
      const previous = new URL(document.referrer);
      if (previous.origin === window.location.origin) {
        router.back();
        return;
      }
    }

    router.replace(fallback);
  }

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label="Back"
      className={`grid size-11 touch-manipulation place-items-center rounded-full text-3xl leading-none active:bg-white/8 ${className}`}
    >
      &#8249;
    </button>
  );
}

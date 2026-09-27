'use client';
import { useI18n } from '@/components/i18n-provider';
import { accountMessages } from '@/lib/i18n/account';
import Link from '@/components/app-link';
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const { locale } = useI18n();
  const t = accountMessages[locale];
  return (
    <main className="mx-auto flex min-h-dvh max-w-[430px] items-center justify-center bg-[#080918] p-6 text-white">
      <div className="space-y-5">
        <h1 className="text-2xl font-semibold">{t.errorTitle}</h1>
        <p className="text-base text-white/70">{t.errorBody}</p>
        <button
          onClick={reset}
          className="min-h-12 w-full rounded-xl bg-violet-600 text-base"
        >
          {t.retry}
        </button>
        <Link href="/" className="block py-3 text-center text-pink-300">
          {t.home}
        </Link>
      </div>
    </main>
  );
}

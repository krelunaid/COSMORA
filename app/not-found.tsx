'use client';
import { useI18n } from '@/components/i18n-provider';
import { accountMessages } from '@/lib/i18n/account';
import Link from '@/components/app-link';
import { MobileShell, MobileNav } from '@/components/mobile-shell';
export default function NotFound() {
  const { locale } = useI18n();
  const t = accountMessages[locale];
  return (
    <MobileShell className="flex flex-col">
      <section className="flex flex-1 flex-col items-center justify-center gap-5 p-6 text-center">
        <h1 className="text-2xl font-semibold">{t.notFound}</h1>
        <p className="text-base text-white/70">{t.removed}</p>
        <Link href="/explore" className="rounded-xl bg-violet-600 p-4">
          {t.explore}
        </Link>
      </section>
      <MobileNav active="explore" />
    </MobileShell>
  );
}

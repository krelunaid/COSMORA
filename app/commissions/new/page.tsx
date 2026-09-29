'use client';
import Link from '@/components/app-link';
import {
  MobileShell,
  ScreenHeader,
  MobileNav,
} from '@/components/mobile-shell';
import { useCommerce } from '@/components/use-commerce';

export default function NewCommissionPage() {
  const { t } = useCommerce();
  return (
    <MobileShell>
      <ScreenHeader title={t('commissions')} back="/explore?section=Creator" />
      <section className="space-y-5 p-5 text-base leading-relaxed">
        <h1 className="text-2xl font-semibold">{t('commissions')}</h1>
        <p className="text-white/75">{t('commissionNotice')}</p>
        <Link
          href="/explore?section=Creator"
          className="flex min-h-12 items-center justify-center rounded-xl bg-violet-600 px-4"
        >
          {t('people')}
        </Link>
      </section>
      <MobileNav active="explore" />
    </MobileShell>
  );
}

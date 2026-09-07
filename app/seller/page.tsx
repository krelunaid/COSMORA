'use client';
import { useI18n } from '@/components/i18n-provider';
import { saleText, type SaleKey } from '@/lib/i18n/sale';
import Link from '@/components/app-link';
import {
  MobileNav,
  MobileShell,
  ScreenHeader,
} from '@/components/mobile-shell';
import { SellerListings } from '@/components/seller-listings';

export default function SellerDashboard() {
  const { locale } = useI18n();
  const t = (key: SaleKey) => saleText(locale, key);

  return (
    <MobileShell>
      <ScreenHeader title={t('dashboard')} back="/profile/me" />
      <div className="space-y-5 px-5 py-5 pb-28">
        <nav
          className="grid grid-cols-2 gap-3 text-base"
          aria-label={t('profile')}
        >
          <Link
            href="/sell"
            className="rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 p-4 text-center"
          >
            {t('title')}
          </Link>
          <Link
            href="/seller/onboarding"
            className="rounded-xl border border-white/20 p-4 text-center"
          >
            {t('profile')}
          </Link>
          <Link
            href="/inbox?tab=orders"
            className="rounded-xl border border-white/20 p-4 text-center"
          >
            {t('orders')}
          </Link>
          <Link
            href="/inbox"
            className="rounded-xl border border-white/20 p-4 text-center"
          >
            {t('inbox')}
          </Link>
        </nav>
        <p className="text-base text-white/70">{t('noPayments')}</p>
        <SellerListings />
      </div>
      <MobileNav active="sell" />
    </MobileShell>
  );
}

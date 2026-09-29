'use client';
import { useCommerce } from '@/components/use-commerce';
import {
  MobileShell,
  MobileNav,
  ScreenHeader,
} from '@/components/mobile-shell';
import { SavedItems } from '@/components/saved-items';
export default function CartPage() {
  const { t } = useCommerce();
  return (
    <MobileShell>
      <ScreenHeader title={t('cart')} back="/marketplace" />
      <SavedItems kind="cart" />
      <MobileNav active="explore" />
    </MobileShell>
  );
}

'use client';
import { useCommerce } from '@/components/use-commerce';
import {
  MobileShell,
  MobileNav,
  ScreenHeader,
} from '@/components/mobile-shell';
import { SavedItems } from '@/components/saved-items';
export default function FavoritesPage() {
  const { t } = useCommerce();
  return (
    <MobileShell>
      <ScreenHeader title={t('favorites')} back="/profile/me" />
      <SavedItems kind="favorite" />
      <MobileNav active="profile" />
    </MobileShell>
  );
}

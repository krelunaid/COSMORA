import {
  MobileShell,
  MobileNav,
  ScreenHeader,
} from '@/components/mobile-shell';
import { SavedItems } from '@/components/saved-items';
export default function FavoritesPage() {
  return (
    <MobileShell>
      <ScreenHeader title="I tuoi preferiti" back="/profile/me" />
      <SavedItems kind="favorite" />
      <MobileNav active="profile" />
    </MobileShell>
  );
}

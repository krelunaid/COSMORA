import {
  MobileShell,
  MobileNav,
  ScreenHeader,
} from '@/components/mobile-shell';
import { LiveListings } from '@/components/live-listings';
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <MobileShell className="flex flex-col">
      <ScreenHeader title="Annuncio" back="/marketplace" />
      <div className="flex-1 px-4">
        <LiveListings slug={slug} />
      </div>
      <MobileNav active="explore" />
    </MobileShell>
  );
}

'use client';
import { useParams } from 'next/navigation';
import { useCommerce } from '@/components/use-commerce';
import {
  MobileShell,
  MobileNav,
  ScreenHeader,
} from '@/components/mobile-shell';
import { LiveListings } from '@/components/live-listings';
export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useCommerce();
  return (
    <MobileShell className="flex flex-col">
      <ScreenHeader title={t('listing')} back="/marketplace" />
      <div className="flex-1 px-4">
        <LiveListings slug={slug} />
      </div>
      <MobileNav active="explore" />
    </MobileShell>
  );
}

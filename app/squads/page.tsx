'use client';
import { useI18n } from '@/components/i18n-provider';
import { communityTranslator } from '@/lib/i18n/community';
import {
  MobileShell,
  MobileNav,
  ScreenHeader,
} from '@/components/mobile-shell';
import { CrewList } from '@/components/crew-list';
import Link from '@/components/app-link';
export default function Squads() {
  const { locale } = useI18n();
  const t = communityTranslator(locale);
  return (
    <MobileShell>
      <ScreenHeader title={t('Crew e incontri')} back="/community" />
      <section className="space-y-5 px-5 py-5 pb-32">
        <p className="text-white/75">
          {t(
            'Trova una squadra cosplay o un appuntamento pubblico con altri appassionati.',
          )}
        </p>
        <Link
          href="/squads/create"
          className="block rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 p-4 text-center font-semibold"
        >
          {t('Organizza una crew o un incontro')}
        </Link>
        <CrewList />
      </section>
      <MobileNav active="explore" />
    </MobileShell>
  );
}

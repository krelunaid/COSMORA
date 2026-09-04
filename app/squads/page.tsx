import {
  MobileShell,
  MobileNav,
  ScreenHeader,
} from '@/components/mobile-shell';
import { CrewList } from '@/components/crew-list';
import Link from '@/components/app-link';
export default function Squads() {
  return (
    <MobileShell>
      <ScreenHeader title="Crew e incontri" back="/community" />
      <section className="space-y-5 px-5 py-5 pb-32">
        <p className="text-white/75">
          Trova una squadra cosplay o un appuntamento pubblico con altri
          appassionati.
        </p>
        <Link
          href="/squads/create"
          className="block rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 p-4 text-center font-semibold"
        >
          Organizza una crew o un incontro
        </Link>
        <CrewList />
      </section>
      <MobileNav active="explore" />
    </MobileShell>
  );
}

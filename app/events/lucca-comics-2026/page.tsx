import Link from '@/components/app-link';
import { ArrowUpRight, UsersRound } from 'lucide-react';
import { MobileNav, MobileShell, ScreenHeader } from '@/components/mobile-shell';

import { EventLiveMap } from '@/components/event-live-map';

const officialSite = 'https://lucca2026.luccacomicsandgames.com/it/home';
const resources = [
  { title: 'Sito ufficiale e aggiornamenti', description: 'Programma, espositori e mappe quando disponibili.', href: officialSite },
  { title: 'Biglietti ufficiali', description: 'Consulta le opzioni sul sito dell’organizzatore.', href: 'https://lucca2026.luccacomicsandgames.com/it/biglietti' },
  { title: 'Informazioni e assistenza evento', description: 'Le risposte degli organizzatori alle domande frequenti.', href: 'https://luccacrea.zendesk.com/' },
];

export default function LuccaEventPage() {
  return (
    <MobileShell className="flex flex-col">
      <ScreenHeader title="Lucca 2026" back="/events" />
      <div className="flex-1 space-y-4 px-4 pb-5 pt-2">
        <header className="px-1 pb-1">
          <h1 className="text-2xl font-bold leading-tight">Lucca Comics <span className="text-pink-300">&amp; Games</span></h1>
          <p className="mt-2 text-sm text-violet-200">28 ottobre – 1 novembre 2026 · Lucca</p>
        </header>
        <EventLiveMap />
        <details className="rounded-2xl border border-white/10 p-4">
          <summary className="cursor-pointer text-base font-semibold">Programma, biglietti e informazioni ↗</summary>
          <div className="mt-3 space-y-3">{resources.map(({ title, description, href }) => (
            <a key={title} href={href} target="_blank" rel="noopener noreferrer" className="flex min-h-14 items-center gap-3 rounded-2xl border border-white/15 bg-[#111225] p-4 focus-visible:outline-2 focus-visible:outline-pink-300">
              <div className="min-w-0 flex-1"><h3 className="text-base font-semibold">{title}</h3><p className="mt-1 text-sm leading-relaxed text-white/75">{description}</p></div><ArrowUpRight aria-hidden="true" className="size-5 shrink-0 text-white/70" />
            </a>
          ))}</div>
          <p className="mt-3 text-sm text-white/65">I collegamenti esterni aprono i siti degli organizzatori.</p>
        </details>
        <Link href="/community" className="flex min-h-14 items-center gap-3 rounded-2xl border border-fuchsia-400/25 bg-violet-950/40 p-4"><UsersRound aria-hidden="true" className="size-6 shrink-0 text-pink-300" /><div><h2 className="text-base font-semibold">Community COSMORA</h2><p className="mt-1 text-sm text-white/75">Esplora i post della community, non il programma ufficiale.</p></div></Link>
        <p className="px-1 text-xs leading-relaxed text-white/60">Guida indipendente di COSMORA, non affiliata né approvata dagli organizzatori. Nessuno stand ufficiale ancora collegato.</p>
      </div>
      <MobileNav active="explore" />
    </MobileShell>
  );
}

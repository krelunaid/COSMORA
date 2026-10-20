'use client';

import Image from 'next/image';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import type { MouseEvent } from 'react';
import Link from '@/components/app-link';
import { ArrowLeft, ArrowUpRight, CalendarDays, MapPin, Ticket, UsersRound } from 'lucide-react';
import { MobileNav, MobileShell, ScreenHeader } from '@/components/mobile-shell';
import { useI18n } from '@/components/i18n-provider';
import type { EuropeEvent } from '@/lib/events-data';
import { formatEventDates } from '@/lib/event-selection';
import { eventCountry } from '@/lib/i18n/events';
import type { Locale } from '@/lib/i18n/config';
import { eventPresentationMessages } from '@/lib/event-presentations';

const en = {
  eyebrow: 'Vienna · 2026',
  lead: 'Film, TV, comics, cosplay, fantasy and gaming come together in Vienna.',
  introduction: 'Experience international stars, a huge Artist Alley, an interactive show floor, family fun and a Game Zone at VIECC Vienna Comic Con.',
  highlights: 'What awaits you',
  artist: 'Artist Alley',
  artistDescription: 'Meet artists and discover original work.',
  showfloor: 'Interactive show floor',
  showfloorDescription: 'Explore the worlds of comics, cosplay and fantasy.',
  games: 'Game Zone & family fun',
  gamesDescription: 'Games and activities for fans of all ages.',
  impressions: 'Impressions from 2025',
  archive: 'Photos from the previous edition; the 2026 programme may differ.',
  map: 'Hall plan & exhibitors',
  mapPending: 'The organiser will publish the programme, exhibitor list and hall plan on its website in the coming days. We will add a navigable map when the official data is available.',
  mapAction: 'Check the official website',
  tickets: 'Official tickets',
  site: 'Event website',
  community: 'Plan your visit together',
  communityDescription: 'Meet other fans in the COSMORA community before the event.',
  supplied: 'Event information and images supplied by VIECC.',
};

const messages: Record<Locale, typeof en> = {
  en,
  de: {
    eyebrow: 'Wien · 2026',
    lead: 'Film, TV, Comic, Cosplay, Fantasy und Gaming treffen sich in Wien.',
    introduction: 'Erlebe internationale Starpower, eine riesige Artist Alley, einen interaktiven Showfloor, Family Fun und die Game Zone auf der VIECC Vienna Comic Con.',
    highlights: 'Das erwartet dich',
    artist: 'Artist Alley',
    artistDescription: 'Triff Künstlerinnen und Künstler und entdecke ihre Werke.',
    showfloor: 'Interaktiver Showfloor',
    showfloorDescription: 'Entdecke die Welten von Comics, Cosplay und Fantasy.',
    games: 'Game Zone & Family Fun',
    gamesDescription: 'Spiele und Erlebnisse für Fans jeden Alters.',
    impressions: 'Eindrücke aus 2025',
    archive: 'Fotos der vergangenen Ausgabe; das Programm 2026 kann abweichen.',
    map: 'Hallenplan & Aussteller',
    mapPending: 'Programm, Ausstellerverzeichnis und Hallenplan erscheinen laut Veranstalter in den kommenden Tagen auf der offiziellen Website. Sobald die Daten vorliegen, können wir eine navigierbare Karte ergänzen.',
    mapAction: 'Zur offiziellen Website',
    tickets: 'Offizielle Tickets',
    site: 'Event-Website',
    community: 'Gemeinsam den Besuch planen',
    communityDescription: 'Lerne vor dem Event andere Fans in der COSMORA-Community kennen.',
    supplied: 'Eventinformationen und Bilder wurden von VIECC bereitgestellt.',
  },
  it: {
    eyebrow: 'Vienna · 2026',
    lead: 'Cinema, TV, fumetti, cosplay, fantasy e gaming si incontrano a Vienna.',
    introduction: 'Scopri ospiti internazionali, una grande Artist Alley, uno spazio espositivo interattivo, attività per famiglie e la Game Zone al VIECC Vienna Comic Con.',
    highlights: 'Cosa ti aspetta',
    artist: 'Artist Alley',
    artistDescription: 'Incontra artisti e scopri le loro opere.',
    showfloor: 'Area interattiva',
    showfloorDescription: 'Esplora i mondi del fumetto, del cosplay e del fantasy.',
    games: 'Game Zone e famiglie',
    gamesDescription: 'Giochi e attività per fan di tutte le età.',
    impressions: 'Immagini del 2025',
    archive: 'Foto dell’edizione precedente; il programma 2026 potrebbe essere diverso.',
    map: 'Padiglioni ed espositori',
    mapPending: 'L’organizzatore pubblicherà a breve programma, elenco espositori e planimetria sul sito ufficiale. Potremo aggiungere una mappa navigabile quando saranno disponibili i dati.',
    mapAction: 'Vai al sito ufficiale',
    tickets: 'Biglietti ufficiali',
    site: 'Sito dell’evento',
    community: 'Organizza la visita insieme',
    communityDescription: 'Conosci altri appassionati nella community di COSMORA prima dell’evento.',
    supplied: 'Informazioni e immagini fornite da VIECC.',
  },
  fr: {
    eyebrow: 'Vienne · 2026',
    lead: 'Cinéma, télévision, BD, cosplay, fantasy et jeux vidéo se retrouvent à Vienne.',
    introduction: 'Découvrez des invités internationaux, une grande Artist Alley, un espace interactif, des activités en famille et la Game Zone au VIECC Vienna Comic Con.',
    highlights: 'Au programme',
    artist: 'Artist Alley',
    artistDescription: 'Rencontrez des artistes et découvrez leurs œuvres.',
    showfloor: 'Espace interactif',
    showfloorDescription: 'Explorez les univers de la BD, du cosplay et de la fantasy.',
    games: 'Game Zone et familles',
    gamesDescription: 'Jeux et activités pour les fans de tout âge.',
    impressions: 'Images de 2025',
    archive: 'Photos de l’édition précédente ; le programme 2026 peut différer.',
    map: 'Plan et exposants',
    mapPending: 'L’organisateur publiera prochainement le programme, la liste des exposants et le plan sur son site officiel. Une carte interactive pourra être ajoutée dès que ces données seront disponibles.',
    mapAction: 'Site officiel',
    tickets: 'Billets officiels',
    site: 'Site de l’événement',
    community: 'Préparez votre visite ensemble',
    communityDescription: 'Rencontrez d’autres fans dans la communauté COSMORA avant l’événement.',
    supplied: 'Informations et images fournies par VIECC.',
  },
  es: {
    eyebrow: 'Viena · 2026',
    lead: 'Cine, televisión, cómics, cosplay, fantasía y videojuegos se reúnen en Viena.',
    introduction: 'Descubre invitados internacionales, una gran Artist Alley, una zona interactiva, actividades familiares y la Game Zone en VIECC Vienna Comic Con.',
    highlights: 'Qué te espera',
    artist: 'Artist Alley',
    artistDescription: 'Conoce a artistas y descubre sus obras.',
    showfloor: 'Zona interactiva',
    showfloorDescription: 'Explora los mundos del cómic, el cosplay y la fantasía.',
    games: 'Game Zone y familias',
    gamesDescription: 'Juegos y actividades para fans de todas las edades.',
    impressions: 'Imágenes de 2025',
    archive: 'Fotos de la edición anterior; el programa de 2026 puede variar.',
    map: 'Plano y expositores',
    mapPending: 'El organizador publicará próximamente el programa, los expositores y el plano en su web oficial. Se podrá añadir un mapa interactivo cuando estén disponibles esos datos.',
    mapAction: 'Web oficial',
    tickets: 'Entradas oficiales',
    site: 'Web del evento',
    community: 'Planifica tu visita',
    communityDescription: 'Conoce a otros fans en la comunidad de COSMORA antes del evento.',
    supplied: 'Información e imágenes facilitadas por VIECC.',
  },
};

const photoCredit = '© FRB Media – Fotograf: Eugen Nemecek';

function openOfficialLink(event: MouseEvent<HTMLAnchorElement>, url: string) {
  if (!Capacitor.isNativePlatform()) return;
  event.preventDefault();
  void Browser.open({ url }).catch(() => window.open(url, '_blank', 'noopener,noreferrer'));
}

export function VieccShowcase({ event }: { event: EuropeEvent }) {
  const { locale } = useI18n();
  const copy = messages[locale];
  const common = eventPresentationMessages[locale];

  return <MobileShell className="flex flex-col">
    <ScreenHeader title={common.showcase} back="/events" />
    <div className="flex-1 pb-7">
      <figure className="relative h-[410px] overflow-hidden bg-[#17131c]">
        <Image src="/events/viecc-official/cosplay-01.jpg" alt="Cosplay at VIECC Vienna Comic Con in 2025" fill priority sizes="(max-width: 600px) 100vw, 600px" className="object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-[#080918]" />
        <div className="absolute left-5 top-5 flex size-[108px] items-center justify-center rounded-[24px] bg-white p-2.5 shadow-xl shadow-black/40">
          <Image src="/events/viecc-official/logo.png" alt="VIECC Vienna Comic Con" width={96} height={96} className="h-full w-full object-contain" />
        </div>
        <div className="absolute inset-x-5 bottom-6">
          <span className="inline-flex rounded-full border border-white/25 bg-black/40 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.16em] text-white/90 backdrop-blur-sm">{copy.eyebrow}</span>
          <h1 className="mt-3 text-[34px] font-black leading-[1.05] tracking-tight text-white drop-shadow-lg">VIECC Vienna<br />Comic Con</h1>
          <p className="mt-3 max-w-sm text-[15px] font-medium leading-snug text-white/90">{copy.lead}</p>
        </div>
      </figure>
      <p className="px-5 py-2 text-[11px] text-white/55">{copy.impressions} · {photoCredit}</p>

      <div className="px-4">
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-white/10 bg-[#171624] p-3.5"><CalendarDays aria-hidden="true" className="size-5 text-[#ff4d58]" /><span className="mt-2 block text-[11px] uppercase tracking-[.12em] text-white/50">{common.date}</span><strong className="mt-1 block text-sm leading-snug">{formatEventDates(event, locale)}</strong></div>
          <div className="rounded-2xl border border-white/10 bg-[#171624] p-3.5"><MapPin aria-hidden="true" className="size-5 text-[#ff4d58]" /><span className="mt-2 block text-[11px] uppercase tracking-[.12em] text-white/50">{common.location}</span><strong className="mt-1 block text-sm leading-snug">VIECON Messe Wien<br />{locale === 'de' ? 'Wien' : event.city}, {eventCountry(event.country, locale)}</strong></div>
        </div>

        <a href="https://viecc.com/tickets/" target="_blank" rel="noopener noreferrer" onClick={(event) => openOfficialLink(event, 'https://viecc.com/tickets/')} className="mt-3 flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-[#d90718] px-4 py-3 text-base font-bold text-white shadow-lg shadow-red-950/30 focus-visible:outline-2 focus-visible:outline-white"><span className="flex items-center gap-2"><Ticket aria-hidden="true" className="size-5" />{copy.tickets}</span><ArrowUpRight aria-hidden="true" className="size-5" /></a>

        <section className="mt-7">
          <h2 className="text-[21px] font-bold tracking-tight">VIECC Vienna Comic Con</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/75">{copy.introduction}</p>
        </section>

        <section className="mt-7">
          <h2 className="text-[21px] font-bold tracking-tight">{copy.highlights}</h2>
          <div className="mt-3 grid gap-2">
            {[
              [copy.artist, copy.artistDescription],
              [copy.showfloor, copy.showfloorDescription],
              [copy.games, copy.gamesDescription],
            ].map(([title, description], index) => <div key={title} className="flex gap-3 rounded-2xl border border-white/10 bg-[#171624] p-4"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#d90718]/15 text-sm font-black text-[#ff636c]">0{index + 1}</span><div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-xs leading-relaxed text-white/60">{description}</p></div></div>)}
          </div>
        </section>

        <section className="mt-7">
          <h2 className="text-[21px] font-bold tracking-tight">{copy.impressions}</h2>
          <p className="mt-1 text-xs leading-relaxed text-white/55">{copy.archive}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-[#171624]"><Image src="/events/viecc-official/cosplay-02.jpg" alt="Cosplay at VIECC in 2025" fill sizes="(max-width: 600px) 50vw, 300px" className="object-cover" /></div>
            <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-[#171624]"><Image src="/events/viecc-official/cosplay-03.jpg" alt="Cosplay at VIECC in 2025" fill sizes="(max-width: 600px) 50vw, 300px" className="object-cover" /></div>
          </div>
          <p className="mt-2 text-[11px] text-white/55">{photoCredit}</p>
        </section>

        <section className="mt-7 rounded-[22px] border border-[#d90718]/25 bg-gradient-to-br from-[#26151d] to-[#141522] p-5">
          <div className="flex items-center gap-2 text-[#ff6b73]"><MapPin aria-hidden="true" className="size-5" /><h2 className="text-lg font-bold text-white">{copy.map}</h2></div>
          <p className="mt-2 text-sm leading-relaxed text-white/70">{copy.mapPending}</p>
          <a href="https://viecc.com/" target="_blank" rel="noopener noreferrer" onClick={(event) => openOfficialLink(event, 'https://viecc.com/')} className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#ff8b91] underline decoration-[#ff8b91]/40 underline-offset-4">{copy.mapAction}<ArrowUpRight aria-hidden="true" className="size-4" /></a>
        </section>

        <a href="https://viecc.com/" target="_blank" rel="noopener noreferrer" onClick={(event) => openOfficialLink(event, 'https://viecc.com/')} className="mt-5 flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-white/90">{copy.site}<ArrowUpRight aria-hidden="true" className="size-4" /></a>
        <Link href="/community" className="mt-3 flex min-h-14 items-start gap-3 rounded-2xl border border-fuchsia-300/20 bg-[#19132b] p-4"><UsersRound aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-pink-300" /><div><h2 className="font-semibold">{copy.community}</h2><p className="mt-1 text-sm leading-relaxed text-white/65">{copy.communityDescription}</p></div></Link>
        <p className="mt-5 text-xs leading-relaxed text-white/50">{copy.supplied} {common.independent}</p>
        <Link href="/events" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm text-pink-200"><ArrowLeft aria-hidden="true" className="size-4" />{common.back}</Link>
      </div>
    </div>
    <MobileNav active="explore" />
  </MobileShell>;
}

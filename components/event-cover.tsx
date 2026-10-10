'use client';

import Image from 'next/image';
import { useI18n } from '@/components/i18n-provider';
import type { EuropeEvent } from '@/lib/events-data';
import { EVENT_MEDIA } from '@/lib/event-media';
import { eventPresentationMessages } from '@/lib/event-presentations';
import { eventMessages } from '@/lib/i18n/events';

export function EventCover({ event, className = '', sizes = '(max-width: 600px) 100vw, 600px', showDetails = true, priority = false }: { event: EuropeEvent; className?: string; sizes?: string; showDetails?: boolean; priority?: boolean }) {
  const { locale } = useI18n();
  const copy = eventPresentationMessages[locale];
  const media = EVENT_MEDIA[event.name];
  const label = media?.kind === 'logo' ? copy.officialLogo : media?.archive ? copy.archive : media ? copy.photo : copy.editorial;
  return <div className={`relative isolate overflow-hidden bg-[#111225] ${className}`}>
    <Image src={event.image} alt={media ? `${event.name}${media.imageYear ? ` · ${media.imageYear}` : ''}` : ''} fill sizes={sizes} priority={priority} className={media ? 'object-contain' : 'object-cover'} />
    {!media && showDetails && <>
      <div className="absolute inset-0 bg-gradient-to-r from-[#100d28]/80 via-[#100d28]/20 to-transparent" />
      <div className="absolute inset-y-0 left-5 flex max-w-[64%] flex-col justify-center gap-2 sm:left-7">
        <span className="text-[10px] font-semibold uppercase tracking-[.22em] text-pink-200">{eventMessages[locale].types[event.type]}</span>
        <span className="text-4xl font-bold tracking-tighter text-white/95 sm:text-5xl">{event.start.slice(0, 4)}</span>
        <span className="text-sm font-medium text-white/80">{event.flag} {event.city}</span>
      </div>
    </>}
    <span className="absolute bottom-2 right-2 max-w-[90%] rounded-md bg-[#080913]/90 px-2 py-1 text-[10px] leading-4 text-white/85">{label}{media?.imageYear ? ` · ${media.imageYear}` : ''}</span>
  </div>;
}

export function EventMediaCredit({ event, className = '' }: { event: EuropeEvent; className?: string }) {
  const { locale } = useI18n();
  const copy = eventPresentationMessages[locale];
  const media = EVENT_MEDIA[event.name];
  if (!media) return null;
  return <p className={`text-[11px] leading-relaxed text-white/60 ${className}`}>
    {media.archive ? copy.archive : media.kind === 'logo' ? copy.officialLogo : copy.photo}{media.imageYear ? ` ${media.imageYear}` : ''}: {media.credit}.{' '}
    <a href={media.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline decoration-white/30 underline-offset-2 hover:text-pink-200">{copy.imageSource}</a>
    {media.licenseUrl && <> · <a href={media.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline decoration-white/30 underline-offset-2 hover:text-pink-200">{media.kind === 'logo' ? copy.usageTerms : media.licenseLabel}</a></>}
  </p>;
}

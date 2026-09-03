'use client';

import { useState } from 'react';
import Link from '@/components/app-link';
import {
  CalendarDays,
  CheckCircle2,
  Link2,
  ShoppingBag,
  UserRound,
  UsersRound,
} from 'lucide-react';

import { CommunityMediaPicker } from '@/components/community-media-picker';
import { MobileShell, ScreenHeader } from '@/components/mobile-shell';
import { moderateText } from '@/lib/community-moderation';
import { europeEvents } from '@/lib/events-data';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

const categories = [
  'Cosplay',
  'Collection',
  'Creator Work',
  'Gaming',
  'Cards',
  'Comics',
  'Figures',
  'Event',
  'Making Of',
];
type ConnectionType = '' | 'event' | 'product' | 'creator' | 'crew';

const connectionTypes = [
  {
    id: 'event' as const,
    label: 'Evento',
    description: 'Il post apparirà anche nella pagina dell’evento.',
    icon: CalendarDays,
  },
  {
    id: 'product' as const,
    label: 'Prodotto',
    description: 'Chi vede il post può aprire direttamente l’articolo.',
    icon: ShoppingBag,
  },
  {
    id: 'creator' as const,
    label: 'Creator',
    description: 'Collega il lavoro al profilo che lo ha realizzato.',
    icon: UserRound,
  },
  {
    id: 'crew' as const,
    label: 'Crew',
    description: 'Collega il post a una squadra cosplay o a un incontro.',
    icon: UsersRound,
  },
];

export default function CreateCommunityPostPage() {
  const [result, setResult] = useState<{
    status: string;
    reasons: string[];
  } | null>(null);
  const [connectionType, setConnectionType] = useState<ConnectionType>('');
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaError, setMediaError] = useState('');
  const italianEvents = europeEvents.filter(
    (event) => event.country === 'Italy',
  );
  const otherEvents = europeEvents.filter((event) => event.country !== 'Italy');

  async function submit(formData: FormData) {
    const rawCaption = formData.get('caption');
    const caption = typeof rawCaption === 'string' ? rawCaption : '';
    const moderation = moderateText('Community post', caption);
    const supabase = getSupabaseBrowserClient();
    const session = await supabase?.auth.getSession();
    const token = session?.data.session?.access_token;
    if (!token) {
      window.location.assign('/auth/login');
      return;
    }
    if (!mediaFiles.length) {
      setMediaError('Aggiungi almeno una foto o un video.');
      return;
    }
    setPublishing(true);
    setPublishError('');
    formData.delete('media');
    for (const file of mediaFiles) {
      formData.append('media', file);
    }
    formData.set('connectionType', connectionType);
    const response = await fetch('/api/community/posts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      moderation?: { status: string; reasons: string[] };
    } | null;
    setPublishing(false);
    if (!response.ok) {
      setPublishError(payload?.error ?? 'Pubblicazione non riuscita.');
      return;
    }
    setResult(payload?.moderation ?? moderation);
  }

  if (result)
    return (
      <MobileShell>
        <div className="flex min-h-[760px] flex-col items-center justify-center px-8 text-center">
          <CheckCircle2
            className={`size-16 ${result.status === 'ACTIVE' ? 'text-emerald-300' : 'text-amber-300'}`}
          />
          <h1 className="mt-5 text-2xl font-semibold">
            {result.status === 'ACTIVE'
              ? 'Post published'
              : 'Post sent for review'}
          </h1>
          <p className="mt-3 text-sm text-white/50">
            {result.reasons[0] ??
              'Il post è visibile nella Community e nella pagina collegata.'}
          </p>
          <Link
            href="/community"
            className="mt-6 grid h-11 w-full place-items-center rounded-xl bg-gradient-to-r from-pink-500 to-violet-500"
          >
            Open Community
          </Link>
        </div>
      </MobileShell>
    );

  return (
    <MobileShell>
      <ScreenHeader title="Post to Community" back="/community" />
      <form action={submit} className="space-y-4 p-4">
        <CommunityMediaPicker
          onFilesChange={setMediaFiles}
          error={mediaError}
          onError={setMediaError}
        />
        <textarea
          required
          name="caption"
          minLength={12}
          placeholder="Racconta cosa stai condividendo…"
          className="checkout-input min-h-28 resize-none py-3"
        />
        <select required name="category" className="checkout-input">
          <option value="">Scegli la categoria</option>
          {categories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </select>

        <section className="space-y-3 rounded-2xl border border-white/8 bg-[#111225] p-3">
          <div className="flex items-start gap-2">
            <Link2 className="mt-0.5 size-4 shrink-0 text-violet-300" />
            <div>
              <h2 className="text-xs">
                Collega a…{' '}
                <span className="font-normal text-white/35">facoltativo</span>
              </h2>
              <p className="mt-1 text-[8px] leading-3 text-white/40">
                Serve per rendere cliccabile nel post un evento, prodotto,
                creator o crew. Se non ti serve, lascia vuoto.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {connectionTypes.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() =>
                  setConnectionType((current) => (current === id ? '' : id))
                }
                className={`flex h-10 items-center justify-center gap-2 rounded-xl border text-[9px] ${connectionType === id ? 'border-pink-400 bg-pink-400/10 text-pink-200' : 'border-white/8 text-white/50'}`}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>
          {connectionType && (
            <p className="rounded-lg bg-white/[.035] p-2 text-[8px] leading-3 text-white/45">
              {
                connectionTypes.find((item) => item.id === connectionType)
                  ?.description
              }
            </p>
          )}
          {connectionType === 'event' && (
            <select name="connection" required className="checkout-input">
              <option value="">Scegli un evento</option>
              <optgroup label="🇮🇹 Italia">
                {italianEvents.map((event) => (
                  <option key={event.name} value={event.name}>
                    {event.name} · {event.city} · {event.dateLabel}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Europa">
                {otherEvents.map((event) => (
                  <option key={event.name} value={event.name}>
                    {event.flag} {event.name} · {event.city}
                  </option>
                ))}
              </optgroup>
            </select>
          )}
          {connectionType === 'product' && (
            <select name="connection" required className="checkout-input">
              <option value="">Scegli un tuo prodotto</option>
              <option>Raiden Shogun Cosplay Costume</option>
              <option>Custom Wig Commission</option>
            </select>
          )}
          {connectionType === 'creator' && (
            <select name="connection" required className="checkout-input">
              <option value="">Scegli un creator</option>
              <option>Stardust Atelier</option>
            </select>
          )}
          {connectionType === 'crew' && (
            <select name="connection" required className="checkout-input">
              <option value="">Scegli crew o incontro</option>
              <option>One Piece Crew Lucca 2026</option>
              <option>Lucca Night Photo Meetup</option>
            </select>
          )}
        </section>
        {publishError && (
          <p role="alert" className="text-[9px] text-rose-300">
            {publishError}
          </p>
        )}
        <button
          disabled={publishing}
          className="h-12 w-full rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 text-sm font-medium disabled:opacity-60"
        >
          {publishing ? 'Pubblicazione…' : 'Publish Post'}
        </button>
      </form>
    </MobileShell>
  );
}

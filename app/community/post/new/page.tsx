'use client';
import { useI18n } from '@/components/i18n-provider';
import { communityTranslator, communityError } from '@/lib/i18n/community';

import { useEffect, useState } from 'react';
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
import { accountRequest } from '@/lib/account-client';
import { moderateText } from '@/lib/community-moderation';
import { europeEvents } from '@/lib/events-data';
import { formatEventDates } from '@/lib/event-selection';
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
    description: 'Chi legge può aprire la pagina dell’evento.',
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
    label: 'Profilo',
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
  const { locale } = useI18n();
  const t = communityTranslator(locale);
  const [result, setResult] = useState<{
    status: string;
    reasons: string[];
  } | null>(null);
  const [connectionType, setConnectionType] = useState<ConnectionType>('');
  const [options, setOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [connectionError, setConnectionError] = useState('');
  useEffect(() => {
    let active = true;
    if (!connectionType || connectionType === 'event') return;
    accountRequest<{ options: Array<{ value: string; label: string }> }>(
      '/api/community/connections?type=' + connectionType,
    )
      .then((d) => {
        if (active) {
          setOptions(d.options);
          setConnectionError('');
        }
      })
      .catch((e) => {
        if (active) {
          setOptions([]);
          setConnectionError(
            communityError(locale, e, 'Caricamento non riuscito.'),
          );
        }
      });
    return () => {
      active = false;
    };
  }, [connectionType, locale]);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaError, setMediaError] = useState('');
  const italianEvents = europeEvents.filter(
    (event) => event.country === 'Italy',
  );
  const otherEvents = europeEvents.filter((event) => event.country !== 'Italy');

  async function submit(formData: FormData) {
    if (publishing) return;
    if (!mediaFiles.length) {
      setMediaError(t('Aggiungi almeno una foto o un video.'));
      return;
    }
    setPublishing(true);
    setPublishError('');
    try {
      const rawCaption = formData.get('caption');
      const caption = typeof rawCaption === 'string' ? rawCaption : '';
      const moderation = moderateText('Community post', caption);
      const session = await getSupabaseBrowserClient()?.auth.getSession();
      const token = session?.data.session?.access_token;
      if (!token) {
        window.location.assign('/auth/login');
        return;
      }
      formData.delete('media');
      for (const file of mediaFiles) formData.append('media', file);
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
      if (!response.ok || !payload)
        throw new Error(payload?.error ?? 'Pubblicazione non riuscita.');
      setResult(payload.moderation ?? moderation);
    } catch (error) {
      setPublishError(
        communityError(locale, error, 'Pubblicazione non riuscita.'),
      );
    } finally {
      setPublishing(false);
    }
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
              ? t('Post pubblicato')
              : t('Post inviato in revisione')}
          </h1>
          <p className="mt-3 text-sm text-white/50">
            {result.reasons[0]
              ? t(result.reasons[0])
              : t(
                  result.status === 'ACTIVE'
                    ? 'Il post è visibile nella Community.'
                    : 'Il post sarà visibile dopo la revisione.',
                )}
          </p>
          <Link
            href="/community"
            className="mt-6 grid h-11 w-full place-items-center rounded-xl bg-gradient-to-r from-pink-500 to-violet-500"
          >
            {t('Apri Community')}
          </Link>
        </div>
      </MobileShell>
    );

  return (
    <MobileShell>
      <ScreenHeader title={t('Pubblica nella Community')} back="/community" />
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
          maxLength={2000}
          aria-label={t('Descrizione')}
          placeholder={t('Racconta cosa stai condividendo…')}
          className="checkout-input min-h-28 resize-none py-3"
        />
        <select
          required
          name="category"
          aria-label={t('Scegli la categoria')}
          className="checkout-input"
        >
          <option value="">{t('Scegli la categoria')}</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {t(category)}
            </option>
          ))}
        </select>

        <section className="space-y-3 rounded-2xl border border-white/8 bg-[#111225] p-3">
          <div className="flex items-start gap-2">
            <Link2 className="mt-0.5 size-4 shrink-0 text-violet-300" />
            <div>
              <h2 className="text-xs">
                {t('Collega a…')}{' '}
                <span className="font-normal text-white/35">
                  {t('facoltativo')}
                </span>
              </h2>
              <p className="mt-1 text-sm leading-5 text-white/60">
                {t(
                  'Collega un evento, prodotto, profilo o crew al tuo post. Puoi anche lasciare vuoto.',
                )}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {connectionTypes.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-pressed={connectionType === id}
                onClick={() => {
                  setOptions([]);
                  setConnectionError('');
                  setConnectionType((current) => (current === id ? '' : id));
                }}
                className={`flex h-10 items-center justify-center gap-2 rounded-xl border text-sm ${connectionType === id ? 'border-pink-400 bg-pink-400/10 text-pink-200' : 'border-white/8 text-white/50'}`}
              >
                <Icon className="size-3.5" />
                {t(label)}
              </button>
            ))}
          </div>
          {connectionType && (
            <p className="rounded-lg bg-white/[.035] p-2 text-sm leading-5 text-white/65">
              {t(
                connectionTypes.find((item) => item.id === connectionType)
                  ?.description ?? '',
              )}
            </p>
          )}
          {connectionType === 'event' && (
            <select
              name="connection"
              required
              aria-label={t('Scegli un evento')}
              className="checkout-input"
            >
              <option value="">{t('Scegli un evento')}</option>
              <optgroup label={'🇮🇹 ' + t('Italia')}>
                {italianEvents.map((event) => (
                  <option key={event.name} value={event.name}>
                    {event.name} · {event.city} ·{' '}
                    {formatEventDates(event, locale)}
                  </option>
                ))}
              </optgroup>
              <optgroup label={t('Europa')}>
                {otherEvents.map((event) => (
                  <option key={event.name} value={event.name}>
                    {event.flag} {event.name} · {event.city}
                  </option>
                ))}
              </optgroup>
            </select>
          )}
          {connectionType && connectionType !== 'event' && (
            <>
              <select
                name="connection"
                aria-label={t('Scegli un collegamento')}
                required
                className="checkout-input"
                key={connectionType}
              >
                <option value="">{t('Scegli un collegamento')}</option>
                {options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {connectionError ? (
                <p role="alert" className="text-sm text-amber-200">
                  {connectionError}
                </p>
              ) : (
                !options.length && (
                  <p className="text-sm text-white/70">
                    {t(
                      'Nessun contenuto disponibile da collegare. Puoi pubblicare senza collegamenti.',
                    )}
                  </p>
                )
              )}
            </>
          )}
        </section>
        {publishError && (
          <p role="alert" className="text-sm text-rose-300">
            {publishError}
          </p>
        )}
        <button
          disabled={publishing}
          className="h-12 w-full rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 text-sm font-medium disabled:opacity-60"
        >
          {publishing ? t('Pubblicazione…') : t('Pubblica post')}
        </button>
      </form>
    </MobileShell>
  );
}

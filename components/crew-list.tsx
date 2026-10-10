'use client';
import { apiFetch } from '@/lib/api-fetch';
import { useI18n } from '@/components/i18n-provider';
import { communityTranslator } from '@/lib/i18n/community';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import Link from '@/components/app-link';
import { useBlockedContent } from '@/components/use-blocked-content';
import { BlockedContentNotice } from '@/components/blocked-content-notice';
import { withoutBlockedAuthors } from '@/lib/blocked-content';
export type Crew = {
  id: string;
  owner_id: string;
  name: string;
  squad_type: string;
  description: string;
  city: string;
  starts_at: string;
  approximate_location: string;
  max_members: number;
  memberCount: number;
  myStatus: string | null;
  rules: string;
  status: string;
  approval_required: boolean;
  requests?: Array<{ user_id: string }>;
};
export function CrewList({ query = '' }: { query?: string }) {
  const { locale } = useI18n();
  const t = communityTranslator(locale);
  const [crews, setCrews] = useState<Crew[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { blockedIds, blocksRevision, blocksReady, blocksError, retryBlocks } = useBlockedContent();
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    void (async () => {
      try {
        const session = await getSupabaseBrowserClient()?.auth.getSession();
        if (controller.signal.aborted) return;
        if (session?.error) throw session.error;
        const token = session?.data.session?.access_token;
        const r = await apiFetch('/api/squads', {
          signal: controller.signal,
          headers: token ? { Authorization: 'Bearer ' + token } : {},
        });
        const d = (await r.json()) as { squads: Crew[]; error?: string };
        if (!r.ok) throw Error(d.error);
        if (!controller.signal.aborted) setCrews(d.squads);
      } catch {
        if (!controller.signal.aborted)
          setError(t('Non riesco a caricare le crew. Riprova tra poco.'));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [t, blocksRevision]);
  const needle = query.trim().toLocaleLowerCase(locale);
  const visible = (blocksReady ? withoutBlockedAuthors(crews, blockedIds, (crew) => crew.owner_id) : []).filter(
    (crew) =>
      !needle ||
      `${crew.name} ${crew.description} ${crew.city}`
        .toLocaleLowerCase(locale)
        .includes(needle),
  );
  return (
    <div className="space-y-4">
      <BlockedContentNotice ready={blocksReady} error={blocksError} retry={retryBlocks} />
      {!blocksReady ? null : loading ? (
        <output>{t('Caricamento crew…')}</output>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : !visible.length ? (
        <p className="rounded-2xl border border-white/10 p-5 text-white/70">
          {t(
            needle
              ? 'Nessun risultato trovato.'
              : 'Non ci sono ancora crew o incontri in programma. Organizza il primo.',
          )}
        </p>
      ) : (
        visible.map((c) => (
          <Link
            href={'/squads/' + c.id}
            key={c.id}
            className="block rounded-2xl border border-white/15 bg-white/5 p-5"
          >
            <p className="text-sm text-pink-300">
              {c.squad_type === 'COSPLAY_SQUAD'
                ? t('Crew cosplay')
                : t('Incontro pubblico')}
            </p>
            <h2 className="mt-2 text-xl font-semibold">{c.name}</h2>
            <p className="mt-2 text-white/75">
              {c.city} ·{' '}
              {new Date(c.starts_at).toLocaleString(locale, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
            <p className="mt-2 text-sm text-white/65">
              {c.memberCount}/{c.max_members} {t('partecipanti')}
            </p>
          </Link>
        ))
      )}
    </div>
  );
}

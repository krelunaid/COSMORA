'use client';
import { apiFetch } from '@/lib/api-fetch';
import { useI18n } from '@/components/i18n-provider';
import { communityTranslator, communityError } from '@/lib/i18n/community';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  MobileShell,
  MobileNav,
  ScreenHeader,
} from '@/components/mobile-shell';
import { type Crew } from '@/components/crew-list';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { accountRequest } from '@/lib/account-client';
import Link from '@/components/app-link';
import { ReportButton } from '@/components/report-button';
import { useBlockedContent } from '@/components/use-blocked-content';
import { BlockedContentNotice } from '@/components/blocked-content-notice';
export default function CrewDetail() {
  const { locale } = useI18n();
  const t = communityTranslator(locale);
  const { slug } = useParams<{ slug: string }>();
  const [crew, setCrew] = useState<Crew>();
  const [user, setUser] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const { blockedIds, blocksRevision, blocksReady, blocksError, retryBlocks } = useBlockedContent();
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const s = await getSupabaseBrowserClient()?.auth.getSession();
        if (s?.error) throw s.error;
        if (!active) return;
        const token = s?.data.session?.access_token;
        const r = await apiFetch('/api/squads?id=' + slug, {
          headers: token ? { Authorization: 'Bearer ' + token } : {},
        });
        const d = (await r.json()) as {
          squads: Crew[];
          userId?: string;
          error?: string;
        };
        if (!r.ok) throw Error(d.error);
        if (active) {
          setCrew(d.squads[0]);
          setUser(d.userId || '');
          setError('');
        }
      } catch (e) {
        if (active)
          setError(communityError(locale, e, 'Errore di caricamento.'));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [slug, version, locale, blocksRevision]);
  async function act(action: string, memberId?: string) {
    setBusy(true);
    setError('');
    try {
      await accountRequest('/api/squads', {
        method: 'PATCH',
        body: JSON.stringify({ id: slug, action, memberId }),
      });
      setVersion((v) => v + 1);
    } catch (e) {
      setError(communityError(locale, e, 'Operazione non riuscita.'));
    } finally {
      setBusy(false);
    }
  }
  return (
    <MobileShell>
      <ScreenHeader title={t('Crew e incontri')} back="/squads" />
      <section className="space-y-5 p-5 pb-32">
        {!blocksReady ? <BlockedContentNotice ready={blocksReady} error={blocksError} retry={retryBlocks} /> : loading ? (
          <output>{t('Caricamento…')}</output>
        ) : !crew || blockedIds.has(crew.owner_id) ? (
          <p>{t('Questa crew non è disponibile.')}</p>
        ) : (
          <>
            <h1 className="text-3xl font-semibold">{crew.name}</h1>
            <ReportButton targetType="SQUAD" targetId={crew.id} authorId={crew.owner_id} viewerId={user} />
            {crew.status !== 'ACTIVE' && (
              <p className="text-amber-300">
                {t('Questa crew è in revisione e non è ancora pubblica.')}
              </p>
            )}
            <p className="whitespace-pre-wrap text-lg text-white/80">
              {crew.description}
            </p>
            <div className="space-y-2 rounded-2xl border border-white/15 p-5">
              <p>{crew.city}</p>
              <p>{new Date(crew.starts_at).toLocaleString(locale)}</p>
              <p>{crew.approximate_location}</p>
              <p>
                {crew.memberCount}/{crew.max_members} {t('partecipanti')}
              </p>
            </div>
            <h2 className="text-xl font-semibold">{t('Regole')}</h2>
            <p className="whitespace-pre-wrap text-white/75">{crew.rules}</p>
            <Link
              href={'/profile/' + crew.owner_id}
              className="block text-pink-300 underline"
            >
              {t('Profilo dell’organizzatore')}
            </Link>
            {user === crew.owner_id ? (
              <div>
                <h2 className="text-xl font-semibold">
                  {t('Richieste di partecipazione')}
                </h2>
                {!crew.requests?.length ? (
                  <p className="mt-3 text-white/65">
                    {t('Nessuna richiesta in attesa.')}
                  </p>
                ) : (
                  crew.requests.map((m) => (
                    <div
                      key={m.user_id}
                      className="mt-3 space-y-3 rounded-xl border border-white/15 p-4"
                    >
                      <Link
                        href={'/profile/' + m.user_id}
                        className="underline"
                      >
                        {t('Vedi il profilo')}
                      </Link>
                      <div className="flex gap-3">
                        <button
                          disabled={busy}
                          onClick={() => act('approve', m.user_id)}
                          className="min-h-11 rounded-xl bg-violet-600 px-4"
                        >
                          {t('Approva')}
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => act('decline', m.user_id)}
                          className="min-h-11 rounded-xl border border-white/20 px-4"
                        >
                          {t('Rifiuta')}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : user ? (
              <>
                <p className="text-white/70">
                  {crew.myStatus === 'ACTIVE'
                    ? t('Sei tra i partecipanti.')
                    : crew.myStatus === 'PENDING'
                      ? t('Richiesta inviata: attendi l’approvazione.')
                      : new Date(crew.starts_at) <= new Date()
                        ? t('Questo incontro è già iniziato.')
                        : crew.memberCount >= crew.max_members
                          ? t('La crew è al completo.')
                          : crew.approval_required
                            ? t(
                                'L’organizzatore deve approvare la partecipazione.',
                              )
                            : t('Puoi unirti fino a esaurimento posti.')}
                </p>
                <button
                  disabled={
                    busy ||
                    ((new Date(crew.starts_at) <= new Date() ||
                      crew.memberCount >= crew.max_members) &&
                      crew.myStatus !== 'ACTIVE' &&
                      crew.myStatus !== 'PENDING')
                  }
                  onClick={() =>
                    act(
                      crew.myStatus === 'ACTIVE' || crew.myStatus === 'PENDING'
                        ? 'leave'
                        : 'join',
                    )
                  }
                  className="min-h-12 w-full rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 px-4 disabled:opacity-50"
                >
                  {busy
                    ? t('Attendi…')
                    : crew.myStatus === 'ACTIVE'
                      ? t('Lascia la crew')
                      : crew.myStatus === 'PENDING'
                        ? t('Annulla richiesta')
                        : t('Partecipa')}
                </button>
              </>
            ) : (
              <Link
                href="/auth/login"
                className="block rounded-xl bg-violet-600 p-4 text-center"
              >
                {t('Accedi per partecipare')}
              </Link>
            )}
          </>
        )}
        {error && (
          <p role="alert" className="text-rose-300">
            {error}
          </p>
        )}
      </section>
      <MobileNav active="explore" />
    </MobileShell>
  );
}

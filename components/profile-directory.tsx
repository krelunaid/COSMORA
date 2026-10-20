'use client';
import { apiFetch } from '@/lib/api-fetch';
import { useI18n } from '@/components/i18n-provider';
import { accountMessages } from '@/lib/i18n/account';
import { profileSafetyMessages } from '@/lib/i18n/profile-safety';
import { useEffect, useState } from 'react';
import Link from '@/components/app-link';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useBlockedContent } from '@/components/use-blocked-content';
import { BlockedContentNotice } from '@/components/blocked-content-notice';
import { withoutBlockedAuthors } from '@/lib/blocked-content';
export function ProfileDirectory({ query = '' }: { query?: string }) {
  const { locale } = useI18n();
  const t = accountMessages[locale];
  const safety = profileSafetyMessages[locale];
  const [rows, setRows] = useState<
    Array<{ id: string; display_name: string; country: string }>
  >([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const { blockedIds, blocksRevision, blocksReady, blocksError, retryBlocks, viewerId } = useBlockedContent();
  const visibleRows = blocksReady ? withoutBlockedAuthors(rows, blockedIds, (profile) => profile.id) : [];
  const [lastQuery, setLastQuery] = useState(query);
  if (lastQuery !== query) {
    setLastQuery(query);
    setLoading(true);
  }
  useEffect(() => {
    const c = new AbortController();
    const t = setTimeout(
      () => {
        setLoading(true);
        void (async () => {
          const session = await getSupabaseBrowserClient()?.auth.getSession();
          if (session?.error) throw session.error;
          if (c.signal.aborted) throw new DOMException('Aborted', 'AbortError');
          const token = session?.data.session?.access_token;
          return apiFetch('/api/profiles?q=' + encodeURIComponent(query), {
            signal: c.signal,
            headers: token ? { Authorization: 'Bearer ' + token } : {},
          });
        })()
          .then(async (r) => {
            const d = (await r.json()) as { profiles: typeof rows };
            if (!r.ok) throw Error('Profili non disponibili.');
            if (!c.signal.aborted) {
              setRows(d.profiles);
              setError('');
            }
          })
          .catch(() => {
            if (!c.signal.aborted) setError('profilesFailed');
          })
          .finally(() => {
            if (!c.signal.aborted) setLoading(false);
          });
      },
      200,
    );
    return () => {
      clearTimeout(t);
      c.abort();
    };
  }, [query, blocksRevision]);
  return (
    <div className="space-y-3">
      <BlockedContentNotice ready={blocksReady} error={blocksError} retry={retryBlocks} />
      {!blocksReady ? null : loading ? (
        <output>{t.profilesLoading}</output>
      ) : error ? (
        <p role="alert">{t.profilesFailed}</p>
      ) : !visibleRows.length ? (
        <p className="text-white/70">{t.noProfiles}</p>
      ) : (
        visibleRows.map((p) => (
          <Link
            key={p.id}
            href={'/profile/' + p.id}
            className="flex min-h-20 items-center gap-4 rounded-xl border border-white/15 p-4"
          >
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-violet-500/30 text-xl">
              {p.display_name?.slice(0, 1) || 'C'}
            </span>
            <div className="min-w-0">
              <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold">
                <span className="break-words">{p.display_name || t.user}</span>
                {p.id === viewerId && (
                  <span className="rounded-full border border-violet-300/30 bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-100">
                    {safety.you}
                  </span>
                )}
              </h2>
              <p className="text-sm text-white/65">{p.country}</p>
            </div>
          </Link>
        ))
      )}
    </div>
  );
}

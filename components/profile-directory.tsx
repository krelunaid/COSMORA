'use client';
import { useEffect, useState } from 'react';
import Link from '@/components/app-link';
export function ProfileDirectory({ query = '' }: { query?: string }) {
  const [rows, setRows] = useState<
    Array<{ id: string; display_name: string; country: string }>
  >([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastQuery, setLastQuery] = useState(query);
  if (lastQuery !== query) {
    setLastQuery(query);
    setLoading(true);
  }
  useEffect(() => {
    const c = new AbortController();
    const t = setTimeout(
      () =>
        fetch('/api/profiles?q=' + encodeURIComponent(query), {
          signal: c.signal,
        })
          .then(async (r) => {
            const d = (await r.json()) as { profiles: typeof rows };
            if (!r.ok) throw Error('Profili non disponibili.');
            setRows(d.profiles);
            setError('');
          })
          .catch((e) => {
            if (e.name !== 'AbortError') setError(e.message);
          })
          .finally(() => setLoading(false)),
      200,
    );
    return () => {
      clearTimeout(t);
      c.abort();
    };
  }, [query]);
  return (
    <div className="space-y-3">
      {loading ? (
        <output>Caricamento profili…</output>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : !rows.length ? (
        <p className="text-white/70">Nessun profilo trovato.</p>
      ) : (
        rows.map((p) => (
          <Link
            key={p.id}
            href={'/profile/' + p.id}
            className="flex min-h-20 items-center gap-4 rounded-xl border border-white/15 p-4"
          >
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-violet-500/30 text-xl">
              {p.display_name?.slice(0, 1) || 'C'}
            </span>
            <div>
              <h2 className="text-lg font-semibold">
                {p.display_name || 'Utente COSMORA'}
              </h2>
              <p className="text-sm text-white/65">{p.country}</p>
            </div>
          </Link>
        ))
      )}
    </div>
  );
}

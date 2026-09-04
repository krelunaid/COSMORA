'use client';
import { useEffect, useState } from 'react';
import Link from '@/components/app-link';
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
export function CrewList() {
  const [crews, setCrews] = useState<Crew[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/squads', { signal: controller.signal })
      .then(async (r) => {
        const d = (await r.json()) as { squads: Crew[]; error?: string };
        if (!r.ok) throw Error(d.error);
        setCrews(d.squads);
      })
      .catch((e) => {
        if (e.name !== 'AbortError')
          setError('Non riesco a caricare le crew. Riprova tra poco.');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);
  return (
    <div className="space-y-4">
      {loading ? (
        <output>Caricamento crew…</output>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : !crews.length ? (
        <p className="rounded-2xl border border-white/10 p-5 text-white/70">
          Non ci sono ancora crew o incontri in programma. Organizza il primo.
        </p>
      ) : (
        crews.map((c) => (
          <Link
            href={'/squads/' + c.id}
            key={c.id}
            className="block rounded-2xl border border-white/15 bg-white/5 p-5"
          >
            <p className="text-sm text-pink-300">
              {c.squad_type === 'COSPLAY_SQUAD'
                ? 'Crew cosplay'
                : 'Incontro pubblico'}
            </p>
            <h2 className="mt-2 text-xl font-semibold">{c.name}</h2>
            <p className="mt-2 text-white/75">
              {c.city} ·{' '}
              {new Date(c.starts_at).toLocaleString('it-IT', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
            <p className="mt-2 text-sm text-white/65">
              {c.memberCount}/{c.max_members} partecipanti
            </p>
          </Link>
        ))
      )}
    </div>
  );
}

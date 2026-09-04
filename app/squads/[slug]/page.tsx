'use client';
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
export default function CrewDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [crew, setCrew] = useState<Crew>();
  const [user, setUser] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const s = await getSupabaseBrowserClient()?.auth.getSession();
        const token = s?.data.session?.access_token;
        const r = await fetch('/api/squads?id=' + slug, {
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
        }
      } catch (e) {
        if (active)
          setError(e instanceof Error ? e.message : 'Errore di caricamento.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [slug, version]);
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
      setError(e instanceof Error ? e.message : 'Operazione non riuscita.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <MobileShell>
      <ScreenHeader title="Crew e incontri" back="/squads" />
      <section className="space-y-5 p-5 pb-32">
        {loading ? (
          <output>Caricamento…</output>
        ) : !crew ? (
          <p>Questa crew non è disponibile.</p>
        ) : (
          <>
            <h1 className="text-3xl font-semibold">{crew.name}</h1>
            {crew.status !== 'ACTIVE' && (
              <p className="text-amber-300">
                Questa crew è in revisione e non è ancora pubblica.
              </p>
            )}
            <p className="whitespace-pre-wrap text-lg text-white/80">
              {crew.description}
            </p>
            <div className="space-y-2 rounded-2xl border border-white/15 p-5">
              <p>{crew.city}</p>
              <p>{new Date(crew.starts_at).toLocaleString('it-IT')}</p>
              <p>{crew.approximate_location}</p>
              <p>
                {crew.memberCount}/{crew.max_members} partecipanti
              </p>
            </div>
            <h2 className="text-xl font-semibold">Regole</h2>
            <p className="whitespace-pre-wrap text-white/75">{crew.rules}</p>
            <Link
              href={'/profile/' + crew.owner_id}
              className="block text-pink-300 underline"
            >
              Profilo dell’organizzatore
            </Link>
            {user === crew.owner_id ? (
              <div>
                <h2 className="text-xl font-semibold">
                  Richieste di partecipazione
                </h2>
                {!crew.requests?.length ? (
                  <p className="mt-3 text-white/65">
                    Nessuna richiesta in attesa.
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
                        Vedi il profilo
                      </Link>
                      <div className="flex gap-3">
                        <button
                          disabled={busy}
                          onClick={() => act('approve', m.user_id)}
                          className="min-h-11 rounded-xl bg-violet-600 px-4"
                        >
                          Approva
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => act('decline', m.user_id)}
                          className="min-h-11 rounded-xl border border-white/20 px-4"
                        >
                          Rifiuta
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
                    ? 'Sei tra i partecipanti.'
                    : crew.myStatus === 'PENDING'
                      ? 'Richiesta inviata: attendi l’approvazione.'
                      : crew.approval_required
                        ? 'L’organizzatore deve approvare la partecipazione.'
                        : 'Puoi unirti fino a esaurimento posti.'}
                </p>
                <button
                  disabled={busy || new Date(crew.starts_at) <= new Date()}
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
                    ? 'Attendi…'
                    : crew.myStatus === 'ACTIVE'
                      ? 'Lascia la crew'
                      : crew.myStatus === 'PENDING'
                        ? 'Annulla richiesta'
                        : 'Partecipa'}
                </button>
              </>
            ) : (
              <Link
                href="/auth/login"
                className="block rounded-xl bg-violet-600 p-4 text-center"
              >
                Accedi per partecipare
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

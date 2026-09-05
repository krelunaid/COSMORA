'use client';

import { useEffect, useState } from 'react';
import Link from '@/components/app-link';
import { MobileNav, MobileShell } from '@/components/mobile-shell';
import { accountRequest } from '@/lib/account-client';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { paymentsEnabled } from '@/lib/release-features';

export default function MyProfilePage() {
  const [profile, setProfile] = useState({
    displayName: '',
    country: '',
    email: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    accountRequest('/api/account')
      .then((value) => {
        if (active) {
          setProfile(value);
          setReady(true);
        }
      })
      .catch((reason) => {
        if (active) setError(reason.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  async function save(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await accountRequest('/api/account', {
        method: 'PUT',
        body: JSON.stringify(profile),
      });
      setNotice('Profilo salvato.');
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Salvataggio non riuscito.',
      );
    } finally {
      setSaving(false);
    }
  }
  async function signOut() {
    const result = await getSupabaseBrowserClient()?.auth.signOut();
    if (result?.error) {
      setError('Uscita non riuscita. Riprova.');
      return;
    }
    window.location.assign('/auth/login');
  }
  return (
    <MobileShell>
      <section className="space-y-5 px-5 py-6 pb-28">
        <h1 className="text-2xl font-semibold">Il mio profilo</h1>
        <Link href="/support" className="block rounded-xl border border-white/15 p-4 text-base text-pink-300">
          Assistenza COSMORA
        </Link>
        {loading && <p>Caricamento del tuo account…</p>}
        {error && (
          <output className="block rounded-xl border border-amber-300/30 p-4 text-base text-amber-100">
            {error}
          </output>
        )}
        {!loading && !ready && (
          <Link
            href="/auth/login"
            className="block rounded-xl bg-violet-600 p-4 text-center"
          >
            Accedi o crea un account
          </Link>
        )}
        {ready && (
          <>
            <p className="break-all text-base text-white/75">{profile.email}</p>
            <p className="text-sm text-white/70">La tua email è privata. Scegli un nome pubblico, anche di fantasia, per presentarti nella community.</p>
            <form onSubmit={save} className="space-y-4">
              <label className="block text-base">
                Nome pubblico
                <input
                  value={profile.displayName}
                  onChange={(event) =>
                    setProfile({ ...profile, displayName: event.target.value })
                  }
                  required
                  placeholder="Come vuoi essere chiamato?"
                  minLength={2}
                  maxLength={80}
                  className="mt-2 w-full rounded-xl border border-white/20 bg-[#111225] p-3"
                />
              </label>
              <label className="block text-base">
                Paese
                <input
                  value={profile.country}
                  placeholder="Es. Italia (facoltativo)"
                  onChange={(event) =>
                    setProfile({ ...profile, country: event.target.value })
                  }
                  maxLength={80}
                  className="mt-2 w-full rounded-xl border border-white/20 bg-[#111225] p-3"
                />
              </label>
              <button
                disabled={saving}
                className="w-full rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 p-3 text-base disabled:opacity-50"
              >
                {saving ? 'Salvataggio…' : 'Salva profilo'}
              </button>
              {notice && (
                <output className="block text-base text-emerald-300">
                  {notice}
                </output>
              )}
            </form>
            <nav className="space-y-3 text-base">
              <Link
                className="block rounded-xl border border-white/15 p-4"
                href="/favorites"
              >
                I miei preferiti
              </Link>
              {paymentsEnabled && <Link
                className="block rounded-xl border border-white/15 p-4"
                href="/cart"
              >
                Il mio carrello
              </Link>}
              <Link
                className="block rounded-xl border border-white/15 p-4"
                href="/seller"
              >
                Gestisci i miei annunci
              </Link>
              <Link
                className="block rounded-xl border border-white/15 p-4"
                href="/sell"
              >
                Pubblica un annuncio
              </Link>
              <Link
                className="block rounded-xl border border-white/15 p-4"
                href="/seller/onboarding"
              >
                Impostazioni venditore
              </Link>
              <Link
                className="block rounded-xl border border-white/15 p-4"
                href="/inbox"
              >
                Messaggi e ordini
              </Link>
            </nav>
            <button
              onClick={signOut}
              className="min-h-12 w-full rounded-xl border border-white/20 text-base"
            >
              Esci dall’account
            </button>
            <Link href="/account/delete" className="block min-h-12 rounded-xl border border-rose-400/40 p-3 text-center text-base text-rose-300">Elimina il mio account</Link>
          </>
        )}
      </section>
      <MobileNav active="profile" />
    </MobileShell>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from '@/components/app-link';
import {
  MobileShell,
  MobileNav,
  ScreenHeader,
} from '@/components/mobile-shell';
import { LiveListings } from '@/components/live-listings';
import { ShareButton } from '@/components/share-button';
type Profile = {
  id: string;
  display_name: string;
  country: string;
  created_at: string;
};
export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUsername, setLastUsername] = useState(username);
  if (lastUsername !== username) {
    setLastUsername(username);
    setLoading(true);
    setError('');
    setProfile(null);
  }
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/profiles?id=' + encodeURIComponent(username), {
      signal: controller.signal,
    })
      .then(async (r) => {
        const v = (await r.json()) as { profiles: Profile[]; error?: string };
        if (!r.ok) throw Error(v.error);
        setProfile(v.profiles[0] || null);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [username]);
  return (
    <MobileShell className="flex flex-col">
      <ScreenHeader title="Profilo" back="/explore" />
      <div className="flex-1 p-5">
        {loading ? (
          <output>Caricamento profilo…</output>
        ) : error ? (
          <p role="alert">{error}</p>
        ) : profile ? (
          <>
            <div className="grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-pink-500 to-violet-600 text-3xl font-bold">
              {profile.display_name?.slice(0, 1).toUpperCase() || 'C'}
            </div>
            <h1 className="mt-5 text-2xl font-semibold">
              {profile.display_name || 'Utente COSMORA'}
            </h1>
            <p className="mt-2 text-base text-white/65">{profile.country}</p>
            <p className="mt-2 text-sm text-white/60">
              Su COSMORA dal{' '}
              {new Date(profile.created_at).toLocaleDateString('it-IT', {
                month: 'long',
                year: 'numeric',
              })}
            </p>
            <Link
              href={'/inbox/' + profile.id}
              className="mt-5 flex min-h-12 items-center justify-center rounded-xl bg-violet-600 text-base"
            >
              Invia un messaggio
            </Link>
            <ShareButton title={profile.display_name || 'Profilo COSMORA'} />
            <h2 className="mt-5 text-lg font-semibold">Annunci pubblicati</h2>
            <LiveListings seller={profile.id} />
          </>
        ) : (
          <div className="space-y-4">
            <h1 className="text-xl">Profilo non disponibile</h1>
            <p className="text-base text-white/70">
              Questo profilo non esiste o non è più disponibile.
            </p>
            <Link
              href="/explore?section=Creator"
              className="inline-flex min-h-11 items-center text-pink-300"
            >
              Scopri le persone della community
            </Link>
          </div>
        )}
      </div>
      <MobileNav active="profile" />
    </MobileShell>
  );
}

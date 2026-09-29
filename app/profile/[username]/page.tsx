'use client';
import { useI18n } from '@/components/i18n-provider';
import { accountMessages } from '@/lib/i18n/account';
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
  const { locale, messages } = useI18n();
  const t = accountMessages[locale];
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
        if (!controller.signal.aborted) setProfile(v.profiles[0] || null);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('profilesFailed');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [username]);
  return (
    <MobileShell className="flex flex-col">
      <ScreenHeader title={messages.nav.profile} back="/explore" />
      <div className="flex-1 p-5">
        {loading ? (
          <output>{t.profileLoading}</output>
        ) : error ? (
          <p role="alert">{t.profilesFailed}</p>
        ) : profile ? (
          <>
            <div className="grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-pink-500 to-violet-600 text-3xl font-bold">
              {profile.display_name?.slice(0, 1).toUpperCase() || 'C'}
            </div>
            <h1 className="mt-5 text-2xl font-semibold">
              {profile.display_name || t.user}
            </h1>
            <p className="mt-2 text-base text-white/65">{profile.country}</p>
            <p className="mt-2 text-sm text-white/60">
              {t.memberSince}{' '}
              {new Date(profile.created_at).toLocaleDateString(locale, {
                month: 'long',
                year: 'numeric',
              })}
            </p>
            <Link
              href={'/inbox/' + profile.id}
              className="mt-5 flex min-h-12 items-center justify-center rounded-xl bg-violet-600 text-base"
            >
              {t.sendMessage}
            </Link>
            <ShareButton title={profile.display_name || t.profileTitle} />
            <h2 className="mt-5 text-lg font-semibold">
              {t.publishedListings}
            </h2>
            <LiveListings seller={profile.id} />
          </>
        ) : (
          <div className="space-y-4">
            <h1 className="text-xl">{t.profileUnavailable}</h1>
            <p className="text-base text-white/70">{t.profileMissing}</p>
            <Link
              href="/explore?section=Creator"
              className="inline-flex min-h-11 items-center text-pink-300"
            >
              {t.discoverPeople}
            </Link>
          </div>
        )}
      </div>
      <MobileNav active="profile" />
    </MobileShell>
  );
}

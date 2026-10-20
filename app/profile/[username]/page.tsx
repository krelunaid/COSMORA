'use client';
import { apiFetch } from '@/lib/api-fetch';
import { useI18n } from '@/components/i18n-provider';
import { accountMessages } from '@/lib/i18n/account';
import { profileSafetyMessages } from '@/lib/i18n/profile-safety';
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
import { ReportButton } from '@/components/report-button';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useBlockedContent } from '@/components/use-blocked-content';
import { BlockedContentNotice } from '@/components/blocked-content-notice';
type Profile = {
  id: string;
  display_name: string;
  country: string;
  created_at: string;
};
export default function ProfilePage() {
  const { locale, messages } = useI18n();
  const t = accountMessages[locale];
  const safety = profileSafetyMessages[locale];
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { blockedIds, blocksRevision, blocksReady, blocksError, retryBlocks, viewerId } = useBlockedContent();
  const isOwnProfile = Boolean(viewerId && profile?.id === viewerId);
  const [lastUsername, setLastUsername] = useState(username);
  if (lastUsername !== username) {
    setLastUsername(username);
    setLoading(true);
    setError('');
    setProfile(null);
  }
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      const session = await getSupabaseBrowserClient()?.auth.getSession();
      if (session?.error) throw session.error;
      if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');
      const token = session?.data.session?.access_token;
      return apiFetch('/api/profiles?id=' + encodeURIComponent(username), {
        signal: controller.signal,
        headers: token ? { Authorization: 'Bearer ' + token } : {},
      });
    })()
      .then(async (r) => {
        const v = (await r.json()) as { profiles: Profile[]; userId?: string; error?: string };
        if (!r.ok) throw Error(v.error);
        if (!controller.signal.aborted) {
          setProfile(v.profiles[0] || null);
          setError('');
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('profilesFailed');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [username, blocksRevision]);
  return (
    <MobileShell className="flex flex-col">
      <ScreenHeader title={messages.nav.profile} back="/explore" />
      <div className="flex-1 p-5">
        {!blocksReady ? <BlockedContentNotice ready={blocksReady} error={blocksError} retry={retryBlocks} /> : blockedIds.has(username) ? (
          <div className="space-y-4">
            <h1 className="text-xl font-semibold">{safety.blockedTitle}</h1>
            <p className="text-base text-white/70">{safety.blockedDescription}</p>
            <Link href="/safety" className="inline-flex min-h-12 items-center rounded-xl border border-violet-300/40 px-4 text-violet-200">
              {safety.manageSafety}
            </Link>
          </div>
        ) : loading ? (
          <output>{t.profileLoading}</output>
        ) : error ? (
          <p role="alert">{t.profilesFailed}</p>
        ) : profile && !blockedIds.has(profile.id) ? (
          <>
            <div className="grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-pink-500 to-violet-600 text-3xl font-bold">
              {profile.display_name?.slice(0, 1).toUpperCase() || 'C'}
            </div>
            <h1 className="mt-5 text-2xl font-semibold">
              {profile.display_name || t.user}
            </h1>
            {isOwnProfile && (
              <p className="mt-3 inline-flex rounded-full border border-violet-300/30 bg-violet-500/15 px-3 py-1 text-sm font-medium text-violet-100">
                {safety.ownProfile}
              </p>
            )}
            <p className="mt-2 text-base text-white/65">{profile.country}</p>
            <p className="mt-2 text-sm text-white/60">
              {t.memberSince}{' '}
              {new Date(profile.created_at).toLocaleDateString(locale, {
                month: 'long',
                year: 'numeric',
              })}
            </p>
            {isOwnProfile ? (
              <Link href="/profile/me" className="mt-5 flex min-h-12 items-center justify-center rounded-xl bg-violet-600 text-base">
                {safety.manageProfile}
              </Link>
            ) : (
              <Link
                href={'/inbox/' + profile.id}
                className="mt-5 flex min-h-12 items-center justify-center rounded-xl bg-violet-600 text-base"
              >
                {t.sendMessage}
              </Link>
            )}
            <ShareButton title={profile.display_name || t.profileTitle} />
            {!isOwnProfile && <ReportButton targetType="USER" targetId={profile.id} authorId={profile.id} viewerId={viewerId} />}
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

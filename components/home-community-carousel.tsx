'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { ChevronRight, Images } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from '@/components/app-link';
import { useI18n } from '@/components/i18n-provider';
import { useBlockedContent } from '@/components/use-blocked-content';
import { CommunityPostDetail } from '@/components/community-gallery';
import { apiFetch } from '@/lib/api-fetch';
import { homeCommunityPhotos } from '@/lib/home-community';
import { homeCommunityMessages } from '@/lib/i18n/home-community';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { getSessionWithTimeout } from '@/lib/supabase/session';
import { communityThumbnail, type CommunityPost } from '@/lib/community-feed';

function Photo({ url, fallbackUrl, label }: { url: string; fallbackUrl?: string; label: string }) {
  const [failed, setFailed] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const { locale } = useI18n();
  return failed ? (
    <span className="grid h-full place-content-center gap-2 px-2 text-center text-xs text-white/60">
      <Images aria-hidden className="mx-auto size-6" />
      {homeCommunityMessages[locale].image}
    </span>
  ) : (
    <Image
      src={useFallback && fallbackUrl ? fallbackUrl : url}
      unoptimized
      width={252}
      height={288}
      alt={label}
      loading="lazy"
      onError={() => {
        if (!useFallback && fallbackUrl && fallbackUrl !== url) setUseFallback(true);
        else setFailed(true);
      }}
      className="h-full w-full object-cover"
    />
  );
}

export function HomeCommunityCarousel() {
  const { locale } = useI18n();
  const copy = homeCommunityMessages[locale];
  const router = useRouter();
  const {
    blockedIds,
    blocksReady,
    blocksError,
    blocksRevision,
    viewerId,
    retryBlocks,
  } = useBlockedContent();
  const [feed, setFeed] = useState<{
    posts: CommunityPost[];
    viewerId: string | null;
  }>({ posts: [], viewerId: null });
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [reload, setReload] = useState(0);
  const [selection, setSelection] = useState<{
    id: string;
    viewerId: string;
    revision: number;
  } | null>(null);
  const refreshRef = useRef<() => void>(() => undefined);
  const lastRefresh = useRef(0);
  const posts = homeCommunityPhotos(feed.posts, {
    ready: blocksReady && status === 'ready',
    viewerId,
    loadedViewerId: feed.viewerId,
    blockedIds,
  });
  const selected =
    selection?.viewerId === viewerId && selection.revision === blocksRevision
      ? posts.find((post) => post.id === selection.id)
      : undefined;

  function refresh() {
    setSelection(null);
    setStatus('loading');
    setFeed({ posts: [], viewerId: null });
    setReload((value) => value + 1);
    lastRefresh.current = Date.now();
    retryBlocks();
  }
  useLayoutEffect(() => {
    refreshRef.current = refresh;
  });

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const resume = () => {
      if (!active || document.visibilityState === 'hidden') return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (
          active &&
          document.visibilityState !== 'hidden' &&
          Date.now() - lastRefresh.current > 1000
        )
          refreshRef.current();
      }, 150);
    };
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('focus', resume);
    const listener = Capacitor.isNativePlatform()
      ? App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) resume();
        })
      : null;
    void listener?.catch(() => undefined);
    return () => {
      active = false;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('focus', resume);
      void listener?.then((handle) => handle.remove()).catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    if (!blocksReady) return;
    let active = true;
    const controller = new AbortController();
    const deadline = setTimeout(() => {
      if (!active) return;
      controller.abort();
      setStatus('error');
    }, 20000);
    // Coalesce session/block updates before starting a replacement request.
    const start = setTimeout(() => {
      setStatus('loading');
      void (async () => {
        try {
          const client = getSupabaseBrowserClient();
          if (!client) throw Error('Session unavailable');
          const session = await getSessionWithTimeout(client, {
            signal: controller.signal,
          });
          if (session.error) throw session.error;
          const actor = session.data.session?.user.id ?? '';
          if (actor !== viewerId) throw Error('Account changed');
          const token = session.data.session?.access_token;
          const response = await apiFetch('/api/community/posts?offset=0', {
            signal: controller.signal,
            cache: 'no-store',
            headers: token ? { Authorization: 'Bearer ' + token } : {},
          });
          const value = (await response.json()) as {
            posts?: CommunityPost[];
            userId?: string;
          };
          if (
            !response.ok ||
            !Array.isArray(value.posts) ||
            (value.userId ?? '') !== actor
          )
            throw Error('Feed unavailable');
          if (!active || controller.signal.aborted) return;
          setFeed({ posts: value.posts, viewerId: actor });
          setStatus('ready');
          lastRefresh.current = Date.now();
        } catch {
          if (active && !controller.signal.aborted) setStatus('error');
        } finally {
          clearTimeout(deadline);
        }
      })();
    }, 0);
    return () => {
      active = false;
      controller.abort();
      clearTimeout(start);
      clearTimeout(deadline);
    };
  }, [blocksReady, blocksRevision, viewerId, reload]);

  const failed = blocksError || status === 'error';
  const loading = !failed && (!blocksReady || status === 'loading');
  return (
    <section
      className="home-community-section"
      aria-labelledby="home-community-heading"
    >
      <div className="flex min-h-11 items-center justify-between gap-2">
        <h2 id="home-community-heading" className="text-lg font-semibold">
          {copy.title}
        </h2>
        <Link
          href="/community"
          className="flex min-h-11 items-center gap-1 text-right text-sm text-pink-300"
        >
          {copy.all}
          <ChevronRight aria-hidden className="size-4 shrink-0" />
        </Link>
      </div>
      {loading ? (
        <output className="home-community-placeholder block">
          <span className="sr-only">{copy.loading}</span>
          <div aria-hidden className="flex gap-2.5">
            {[0, 1, 2].map((key) => (
              <span key={key} className="home-community-skeleton" />
            ))}
          </div>
        </output>
      ) : failed ? (
        <div className="home-community-placeholder flex items-center justify-between gap-3 text-sm text-white/65">
          <output>{copy.unavailable}</output>
          <button
            type="button"
            onClick={refresh}
            className="min-h-11 shrink-0 rounded-xl border border-white/15 px-3 text-pink-300"
          >
            {copy.retry}
          </button>
        </div>
      ) : posts.length ? (
        <ul className="home-community-strip" aria-label={copy.title}>
          {posts.map((post) => (
            <li key={post.id}>
              <button
                type="button"
                className="home-community-card"
                aria-label={`${copy.open}: ${post.caption.slice(0, 100)} — ${post.author}`}
                onClick={() =>
                  setSelection({
                    id: post.id,
                    viewerId,
                    revision: blocksRevision,
                  })
                }
              >
                <Photo
                  key={communityThumbnail(post.media.find((media) => media.type === 'IMAGE')!)}
                  url={communityThumbnail(post.media.find((media) => media.type === 'IMAGE')!)}
                  fallbackUrl={post.media.find((media) => media.type === 'IMAGE')!.url}
                  label={post.caption.slice(0, 120)}
                />
                <span className="home-community-caption">
                  <span className="line-clamp-2 break-words font-semibold">
                    {post.caption || post.author}
                  </span>
                </span>
                {post.media.length > 1 && (
                  <span className="absolute top-1.5 right-1.5 flex items-center gap-1 rounded-full bg-black/75 px-1.5 py-1 text-[10px]">
                    <Images className="size-3" aria-hidden />
                    {post.media.length}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="home-community-placeholder flex flex-col items-start justify-center gap-1 text-sm text-white/65">
          <p>{copy.empty}</p>
          <Link
            href="/community/post/new"
            className="flex min-h-11 items-center text-pink-300"
          >
            {copy.create}
            <ChevronRight aria-hidden className="ml-1 size-4" />
          </Link>
        </div>
      )}
      {selected && (
        <CommunityPostDetail
          key={viewerId + ':' + selected.id}
          post={selected}
          viewerId={viewerId}
          onClose={() => setSelection(null)}
          onInteraction={(postId, action, active) =>
            setFeed((previous) => ({
              ...previous,
              posts: previous.posts.map((post) =>
                post.id === postId
                  ? { ...post, [action === 'like' ? 'liked' : 'saved']: active }
                  : post,
              ),
            }))
          }
          onTag={(tag) => {
            setSelection(null);
            router.push('/community?q=' + encodeURIComponent(tag));
          }}
        />
      )}
    </section>
  );
}

'use client';
import { apiFetch } from '@/lib/api-fetch';
import { useI18n } from '@/components/i18n-provider';
import { communityTranslator, communityError } from '@/lib/i18n/community';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Bookmark, Plus, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import Link from '@/components/app-link';
import { MobileShell, MobileNav } from '@/components/mobile-shell';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useBlockedContent } from '@/components/use-blocked-content';
import { BlockedContentNotice } from '@/components/blocked-content-notice';
import { withoutBlockedAuthors } from '@/lib/blocked-content';
import {
  CommunityGrid,
  CommunityPostDetail,
} from '@/components/community-gallery';
import { postHashtags, type CommunityPost as Post } from '@/lib/community-feed';
import { communityGridMessages } from '@/lib/i18n/community-grid';
import { useSearchParams } from 'next/navigation';

export default function CommunityPage() {
  const searchParams = useSearchParams();
  const { locale } = useI18n();
  const t = communityTranslator(locale);
  const copy = communityGridMessages[locale];
  const [savedOnly, setSavedOnly] = useState(false);
  const [loadedSavedOnly, setLoadedSavedOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [query, setQuery] = useState(() => (searchParams.get('q') ?? '').slice(0, 100));
  const normalizedQuery = query.trim().slice(0, 100);
  const [loadedQuery, setLoadedQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [more, setMore] = useState(false);
  const [reload, setReload] = useState(0);
  const [userId, setUserId] = useState('');
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const lastRefresh = useRef(0);
  const refreshRef = useRef<() => void>(() => undefined);
  const {
    blockedIds,
    blocksRevision,
    blocksReady,
    blocksError,
    retryBlocks,
    viewerId,
  } = useBlockedContent();
  const visiblePosts =
    blocksReady &&
    userId === viewerId &&
    loadedQuery === normalizedQuery &&
    savedOnly === loadedSavedOnly
      ? withoutBlockedAuthors(
          posts,
          blockedIds,
          (post) => post.author_id,
        ).filter((post) => !savedOnly || post.saved === true)
      : [];
  const selectedPost = visiblePosts.find((post) => post.id === selectedId);
  const hashtags = [
    ...new Set(visiblePosts.flatMap((post) => postHashtags(post.caption))),
  ].slice(0, 10);
  const [appliedBlocks, setAppliedBlocks] = useState(blocksRevision);
  if (appliedBlocks !== blocksRevision) {
    setAppliedBlocks(blocksRevision);
    setOffset(0);
    setSelectedId(null);
  }

  function refresh() {
    setSelectedId(null);
    lastRefresh.current = Date.now();
    ++generation.current;
    request.current?.abort();
    setOffset(0);
    setLoading(true);
    setError('');
    setMore(false);
    setReload((value) => value + 1);
    // Also refresh the feed when the block IDs themselves did not change.
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
      // iOS can emit appStateChange, visibilitychange and focus together.
      timer = setTimeout(() => {
        if (
          !active ||
          document.visibilityState === 'hidden' ||
          Date.now() - lastRefresh.current < 1000
        )
          return;
        refreshRef.current();
      }, 150);
    };
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('focus', resume);
    const nativeListener = Capacitor.isNativePlatform()
      ? App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) resume();
        })
      : null;
    void nativeListener?.catch(() => undefined);
    return () => {
      active = false;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('focus', resume);
      void nativeListener
        ?.then((handle) => handle.remove())
        .catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    const attempt = ++generation.current;
    const controller = new AbortController();
    request.current?.abort();
    request.current = controller;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    const current = () =>
      attempt === generation.current && !controller.signal.aborted;
    if (!blocksReady) return () => controller.abort();
    const timer = setTimeout(
      () => {
        setLoading(true);
        setError('');
        if (savedOnly && !viewerId) {
          setLoading(false);
          return;
        }
        deadline = setTimeout(() => {
          if (!current()) return;
          ++generation.current;
          controller.abort();
          setError(t('Caricamento non riuscito.'));
          setLoading(false);
        }, 20000);
        void (async () => {
          try {
            const session = await getSupabaseBrowserClient()?.auth.getSession();
            if (session?.error) throw session.error;
            if (!current()) return;
            const actor = session?.data.session?.user.id ?? '';
            if (actor !== viewerId) throw Error('Accesso non disponibile.');
            const token = session?.data.session?.access_token;
            const response = await apiFetch(
              '/api/community/posts?' +
                new URLSearchParams({
                  q: normalizedQuery,
                  offset: String(offset),
                  ...(savedOnly ? { saved: '1' } : {}),
                }),
              {
                signal: controller.signal,
                cache: 'no-store',
                headers: token ? { Authorization: 'Bearer ' + token } : {},
              },
            );
            const value = (await response.json()) as {
              posts: Post[];
              hasMore: boolean;
              userId?: string;
              error?: string;
            };
            if (!response.ok) throw Error(value.error);
            if (!Array.isArray(value.posts) || (value.userId ?? '') !== actor)
              throw Error('Caricamento non riuscito.');
            if (!current()) return;
            setPosts((previous) =>
              offset
                ? [
                    ...previous,
                    ...value.posts.filter(
                      (post) =>
                        !previous.some((existing) => existing.id === post.id),
                    ),
                  ]
                : value.posts,
            );
            setLoadedQuery(normalizedQuery);
            setLoadedSavedOnly(savedOnly);
            setMore(value.hasMore);
            setUserId(actor);
          } catch (reason) {
            if (current())
              setError(
                communityError(locale, reason, 'Caricamento non riuscito.'),
              );
          } finally {
            clearTimeout(deadline);
            if (current()) setLoading(false);
          }
        })();
      },
      normalizedQuery ? 250 : 0,
    );
    return () => {
      clearTimeout(timer);
      clearTimeout(deadline);
      controller.abort();
    };
  }, [
    normalizedQuery,
    offset,
    reload,
    locale,
    t,
    blocksRevision,
    blocksReady,
    blocksError,
    viewerId,
    savedOnly,
  ]);

  function changeQuery(value: string) {
    setSelectedId(null);
    setQuery(value);
    if (value.trim().slice(0, 100) === normalizedQuery) return;
    ++generation.current;
    request.current?.abort();
    setOffset(0);
    setLoading(true);
    setError('');
    setMore(false);
  }

  function changeView(saved: boolean) {
    if (saved === savedOnly && !normalizedQuery) return;
    setSelectedId(null);
    setSavedOnly(saved);
    changeQuery('');
    setOffset(0);
    setError('');
    setLoading(true);
  }

  function updateInteraction(
    postId: string,
    action: 'like' | 'save',
    active: boolean,
  ) {
    setPosts((previous) =>
      previous.map((post) =>
        post.id === postId
          ? { ...post, [action === 'like' ? 'liked' : 'saved']: active }
          : post,
      ),
    );
    if (savedOnly && action === 'save' && !active) {
      setSelectedId(null);
      refresh();
    }
  }

  return (
    <MobileShell className="flex flex-col">
      <header className="flex items-center justify-between gap-2 px-5 pt-6 pb-4">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.2em] text-violet-200/65">
            COSMORA
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {t('Community')}
          </h1>
        </div>
        <Link
          href="/community/post/new"
          className="flex min-h-11 shrink-0 items-center gap-1 rounded-full bg-violet-600 px-3 text-sm font-semibold"
        >
          <Plus className="size-4" aria-hidden />
          {t('Nuovo post')}
        </Link>
      </header>
      <section className="flex-1 space-y-4 px-4 pb-6">
        <div className="flex items-center gap-3">
          <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-3">
            <Search className="size-4 shrink-0 text-white/45" aria-hidden />
            <span className="sr-only">{copy.search}</span>
            <input
              type="search"
              value={query}
              maxLength={100}
              onChange={(event) => changeQuery(event.target.value)}
              placeholder={copy.search}
              className="min-h-11 w-full min-w-0 bg-transparent text-sm outline-offset-2 placeholder:text-white/40"
            />
          </label>
          <Link
            href="/safety"
            className="flex min-h-11 items-center gap-1 text-xs text-violet-100/75"
          >
            <ShieldCheck className="size-4" aria-hidden />
            {copy.safety}
          </Link>
        </div>
        <div className="flex items-center gap-4 border-b border-white/10">
          <button
            type="button"
            aria-pressed={!savedOnly}
            onClick={() => changeView(false)}
            className={`min-h-11 border-b-2 text-sm ${!savedOnly ? 'border-violet-300 text-white' : 'border-transparent text-white/50'}`}
          >
            {copy.discover}
          </button>
          <button
            type="button"
            aria-pressed={savedOnly}
            onClick={() => changeView(true)}
            className={`flex min-h-11 items-center gap-1.5 border-b-2 text-sm ${savedOnly ? 'border-violet-300 text-white' : 'border-transparent text-white/50'}`}
          >
            <Bookmark className="size-3.5" aria-hidden />
            {copy.saved}
          </button>
          <Link
            href="/squads"
            className="ml-auto flex min-h-11 items-center text-xs text-violet-200/70"
          >
            {t('Crew e incontri →')}
          </Link>
        </div>
        <BlockedContentNotice
          ready={blocksReady}
          error={blocksError}
          retry={refresh}
        />
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              aria-pressed={!normalizedQuery}
              onClick={() => changeQuery('')}
              className={`min-h-10 shrink-0 rounded-full border px-3 text-xs ${!normalizedQuery ? 'border-violet-400/40 bg-violet-500/15 text-violet-100' : 'border-white/10 text-white/60'}`}
            >
              {copy.all}
            </button>
            {hashtags.map((tag) => (
              <button
                type="button"
                key={tag}
                aria-pressed={normalizedQuery === tag}
                onClick={() => changeQuery(tag)}
                className="min-h-10 shrink-0 rounded-full border border-white/10 px-3 text-xs text-violet-200"
              >
                {tag}
              </button>
            ))}
            {normalizedQuery && (
              <button
                type="button"
                onClick={() => changeQuery('')}
                className="min-h-10 shrink-0 text-xs text-pink-300"
              >
                {t('Azzera ricerca')}
              </button>
            )}
          </div>
          <button
            type="button"
            aria-label={t('Aggiorna')}
            title={t('Aggiorna')}
            onClick={refresh}
            disabled={loading}
            className="grid size-11 shrink-0 place-items-center rounded-full text-white/60 disabled:opacity-40"
          >
            <RefreshCw
              className={`size-4 ${loading ? 'motion-safe:animate-spin' : ''}`}
              aria-hidden
            />
          </button>
        </div>
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-amber-300/30 p-3"
          >
            <p>{error}</p>
            <button
              type="button"
              onClick={refresh}
              className="min-h-11 text-pink-300"
            >
              {t('Riprova')}
            </button>
          </div>
        )}
        {savedOnly && blocksReady && !viewerId ? (
          <div className="rounded-2xl border border-white/10 p-5 text-center">
            <Bookmark className="mx-auto size-8 text-violet-300" aria-hidden />
            <p className="mt-3 text-sm text-white/70">{copy.savedLogin}</p>
            <Link
              href="/auth/login"
              className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-violet-600 px-5"
            >
              {t('Accedi')}
            </Link>
          </div>
        ) : (
          <>
            {blocksReady && !loading && !error && !visiblePosts.length && (
              <div className="rounded-2xl border border-white/10 p-5 text-center">
                <h2 className="text-lg font-semibold">
                  {normalizedQuery
                    ? t('Nessun post trovato')
                    : savedOnly
                      ? copy.emptySaved
                      : t('Il prossimo post può essere il tuo')}
                </h2>
                <p className="mt-3 text-sm text-white/70">
                  {normalizedQuery
                    ? t('Prova un altro testo oppure azzera la ricerca.')
                    : savedOnly
                      ? copy.savedHint
                      : t(
                          'Condividi un cosplay, una collezione o un momento a un evento.',
                        )}
                </p>
                {normalizedQuery ? (
                  <button
                    type="button"
                    onClick={() => changeQuery('')}
                    className="mt-3 min-h-11 rounded-xl bg-violet-600 px-4"
                  >
                    {t('Azzera ricerca')}
                  </button>
                ) : savedOnly ? (
                  <button
                    type="button"
                    onClick={() => changeView(false)}
                    className="mt-3 min-h-11 rounded-xl bg-violet-600 px-4"
                  >
                    {copy.discover}
                  </button>
                ) : (
                  <Link
                    href="/community/post/new"
                    className="mt-4 inline-block rounded-xl bg-violet-600 px-4 py-3"
                  >
                    {t('Crea un post')}
                  </Link>
                )}
              </div>
            )}
            <CommunityGrid posts={visiblePosts} onOpen={setSelectedId} />
            {!!visiblePosts.length && (
              <p className="text-center text-xs text-white/40">
                {copy.galleryHint}
              </p>
            )}
            {blocksReady && loading && (
              <output className="block py-3 text-sm text-white/70">
                {t('Caricamento post…')}
              </output>
            )}
            {blocksReady && more && !loading && !error && (
              <button
                type="button"
                onClick={() => setOffset((value) => value + 20)}
                className="min-h-12 w-full rounded-xl border border-white/20"
              >
                {copy.loadMore}
              </button>
            )}
          </>
        )}
      </section>
      {selectedPost && (
        <CommunityPostDetail
          key={userId + ':' + selectedPost.id}
          post={selectedPost}
          viewerId={userId}
          onClose={() => setSelectedId(null)}
          onInteraction={updateInteraction}
          onTag={changeQuery}
        />
      )}
      <MobileNav active="home" />
    </MobileShell>
  );
}

'use client';
import { apiFetch } from '@/lib/api-fetch';
import { useI18n } from '@/components/i18n-provider';
import { communityTranslator, communityError } from '@/lib/i18n/community';
/* User-uploaded videos do not yet support caption-file uploads. */
/* oxlint-disable jsx-a11y/media-has-caption */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { ChevronDown, ChevronUp, Play, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import Link from '@/components/app-link';
import { MobileShell, MobileNav } from '@/components/mobile-shell';
import { ShareButton } from '@/components/share-button';
import { ReportButton } from '@/components/report-button';
import { SafetyLink } from '@/components/safety-link';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useBlockedContent } from '@/components/use-blocked-content';
import { BlockedContentNotice } from '@/components/blocked-content-notice';
import { withoutBlockedAuthors } from '@/lib/blocked-content';

type Post = {
  id: string;
  author_id: string;
  author: string;
  caption: string;
  created_at: string;
  link_label: string | null;
  link_url: string | null;
  media: { type: string; url: string }[];
};

export default function CommunityPage() {
  const { locale } = useI18n();
  const t = communityTranslator(locale);
  const [posts, setPosts] = useState<Post[]>([]);
  const [query, setQuery] = useState('');
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
  const lastRefresh = useRef(Date.now());
  const refreshRef = useRef<() => void>(() => undefined);
  const { blockedIds, blocksRevision, blocksReady, blocksError, retryBlocks, viewerId } = useBlockedContent();
  const visiblePosts = blocksReady && userId === viewerId && loadedQuery === normalizedQuery
    ? withoutBlockedAuthors(posts, blockedIds, (post) => post.author_id) : [];
  const [appliedBlocks, setAppliedBlocks] = useState(blocksRevision);
  if (appliedBlocks !== blocksRevision) {
    setAppliedBlocks(blocksRevision);
    setOffset(0);
  }

  function refresh() {
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
  useLayoutEffect(() => { refreshRef.current = refresh; });

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const resume = () => {
      if (!active || document.visibilityState === 'hidden') return;
      clearTimeout(timer);
      // iOS can emit appStateChange, visibilitychange and focus together.
      timer = setTimeout(() => {
        if (!active || document.visibilityState === 'hidden' || Date.now() - lastRefresh.current < 1000) return;
        refreshRef.current();
      }, 150);
    };
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('focus', resume);
    const nativeListener = Capacitor.isNativePlatform()
      ? App.addListener('appStateChange', ({ isActive }) => { if (isActive) resume(); })
      : null;
    void nativeListener?.catch(() => undefined);
    return () => {
      active = false;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('focus', resume);
      void nativeListener?.then((handle) => handle.remove()).catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    const attempt = ++generation.current;
    const controller = new AbortController();
    request.current?.abort();
    request.current = controller;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    const current = () => attempt === generation.current && !controller.signal.aborted;
    if (!blocksReady) {
      setLoading(!blocksError);
      return () => controller.abort();
    }
    setLoading(true);
    setError('');
    const timer = setTimeout(() => {
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
          const response = await apiFetch('/api/community/posts?' + new URLSearchParams({ q: normalizedQuery, offset: String(offset) }), {
            signal: controller.signal,
            cache: 'no-store',
            headers: token ? { Authorization: 'Bearer ' + token } : {},
          });
          const value = (await response.json()) as { posts: Post[]; hasMore: boolean; userId?: string; error?: string };
          if (!response.ok) throw Error(value.error);
          if (!Array.isArray(value.posts) || (value.userId ?? '') !== actor) throw Error('Caricamento non riuscito.');
          if (!current()) return;
          setPosts((previous) => offset
            ? [...previous, ...value.posts.filter((post) => !previous.some((existing) => existing.id === post.id))]
            : value.posts);
          setLoadedQuery(normalizedQuery);
          setMore(value.hasMore);
          setUserId(actor);
        } catch (reason) {
          if (current()) setError(communityError(locale, reason, 'Caricamento non riuscito.'));
        } finally {
          clearTimeout(deadline);
          if (current()) setLoading(false);
        }
      })();
    }, normalizedQuery ? 250 : 0);
    return () => {
      clearTimeout(timer);
      clearTimeout(deadline);
      controller.abort();
    };
  }, [normalizedQuery, offset, reload, locale, t, blocksRevision, blocksReady, blocksError, viewerId]);

  function changeQuery(value: string) {
    setQuery(value);
    if (value.trim().slice(0, 100) === normalizedQuery) return;
    ++generation.current;
    request.current?.abort();
    setOffset(0);
    setLoading(true);
    setError('');
    setMore(false);
  }

  return (
    <MobileShell className="flex flex-col">
      <header className="flex items-center justify-between p-5">
        <h1 className="text-2xl font-semibold">{t('Community')}</h1>
        <Link href="/community/post/new" className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold">{t('Nuovo post')}</Link>
      </header>
      <section className="flex-1 space-y-4 px-4 pb-5">
        <SafetyLink />
        <BlockedContentNotice ready={blocksReady} error={blocksError} retry={refresh} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link href="/squads" className="flex min-h-11 items-center rounded-full border border-violet-400/30 px-4 text-sm text-violet-200">{t('Crew e incontri →')}</Link>
          <button type="button" onClick={refresh} disabled={loading} className="flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-3 text-sm disabled:opacity-50">
            <RefreshCw className={`size-4 ${loading ? 'motion-safe:animate-spin' : ''}`} aria-hidden />{t('Aggiorna')}
          </button>
        </div>
        <label className="block">
          <span className="sr-only">{t('Cerca nel testo dei post')}</span>
          <input type="search" value={query} maxLength={100} onChange={(event) => changeQuery(event.target.value)} placeholder={t('Cerca nel testo dei post')} className="checkout-input" />
        </label>
        <div className="flex min-h-9 items-center justify-between gap-2 text-sm">
          <output aria-live="polite" className="text-white/65">{t('Post visualizzati')}: {visiblePosts.length}</output>
          {normalizedQuery && <button type="button" onClick={() => changeQuery('')} className="min-h-11 text-pink-300">{t('Azzera ricerca')}</button>}
        </div>
        {error && <div role="alert" className="rounded-xl border border-amber-300/30 p-3"><p>{error}</p><button type="button" onClick={refresh} className="min-h-11 text-pink-300">{t('Riprova')}</button></div>}
        {blocksReady && !loading && !error && !visiblePosts.length && (
          <div className="rounded-2xl border border-white/10 p-5 text-center">
            <h2 className="text-lg font-semibold">{normalizedQuery ? t('Nessun post trovato') : t('Il prossimo post può essere il tuo')}</h2>
            <p className="mt-3 text-sm text-white/70">{normalizedQuery ? t('Prova un altro testo oppure azzera la ricerca.') : t('Condividi un cosplay, una collezione o un momento a un evento.')}</p>
            {normalizedQuery ? <button type="button" onClick={() => changeQuery('')} className="mt-3 min-h-11 rounded-xl bg-violet-600 px-4">{t('Azzera ricerca')}</button> : <Link href="/community/post/new" className="mt-4 inline-block rounded-xl bg-violet-600 px-4 py-3">{t('Crea un post')}</Link>}
          </div>
        )}
        <ul aria-label={t('Elenco post')} className="space-y-3">
          {visiblePosts.map((post) => <li key={post.id}><CommunityPostRow post={post} viewerId={userId} /></li>)}
        </ul>
        {loading && <output className="block py-3 text-sm text-white/70">{t('Caricamento post…')}</output>}
        {blocksReady && more && !loading && !error && <button type="button" onClick={() => setOffset((value) => value + 20)} className="min-h-12 w-full rounded-xl border border-white/20">{t('Mostra altri post')}</button>}
      </section>
      <MobileNav active="home" />
    </MobileShell>
  );
}

function CommunityPostRow({ post, viewerId }: { post: Post; viewerId: string }) {
  const { locale } = useI18n();
  const t = communityTranslator(locale);
  const [expanded, setExpanded] = useState(false);
  const thumbnail = post.media.find((media) => media.type !== 'VIDEO');
  const hasVideo = post.media.some((media) => media.type === 'VIDEO');
  const detailId = 'community-details-' + post.id;
  const safeLink = post.link_url && (/^\/(?!\/)/.test(post.link_url) || post.link_url.startsWith('https://'));
  return (
    <article className="overflow-hidden rounded-2xl border border-white/15 bg-[#111225]">
      <div className="flex items-start gap-3 p-3">
        {(thumbnail || hasVideo) && <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} aria-controls={detailId} aria-label={expanded ? t('Nascondi dettagli') : t('Mostra dettagli')} className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-violet-500/10">
          {thumbnail ? <Image unoptimized width={80} height={80} src={thumbnail.url} alt={t('Foto del post')} loading="lazy" className="size-20 object-cover" /> : <span className="flex flex-col items-center gap-1 text-xs text-violet-200"><Play className="size-6" aria-hidden />{t('Video')}</span>}
        </button>}
        <div className="min-w-0 flex-1">
          <Link href={'/profile/' + post.author_id} className="block truncate text-sm font-semibold text-violet-100">{post.author}</Link>
          <time dateTime={post.created_at} className="mt-0.5 block text-xs text-white/50">{new Date(post.created_at).toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' })}</time>
          <p className="mt-2 line-clamp-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-white/85">{post.caption}</p>
          <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} aria-controls={detailId} className="mt-1 flex min-h-11 items-center gap-1 text-sm text-pink-300">{expanded ? t('Nascondi dettagli') : t('Mostra dettagli')}{expanded ? <ChevronUp className="size-4" aria-hidden /> : <ChevronDown className="size-4" aria-hidden />}</button>
        </div>
      </div>
      {expanded && <div id={detailId} className="space-y-3 border-t border-white/10 py-3">
        <p className="whitespace-pre-wrap break-words px-3 text-sm leading-relaxed">{post.caption}</p>
        <div className="flex snap-x snap-mandatory overflow-x-auto">
          {post.media.map((media, index) => <div key={media.url + ':' + index} className="w-full shrink-0 snap-center">{media.type === 'VIDEO' ? <video src={media.url} controls playsInline preload="metadata" className="max-h-[480px] w-full" /> : <Image unoptimized width={800} height={800} src={media.url} alt={t('Foto del post') + ' ' + (index + 1)} loading="lazy" className="max-h-[480px] w-full object-contain" />}</div>)}
        </div>
        {post.media.length > 1 && <p className="px-3 text-xs text-white/65">{t('Scorri foto e video →')} ({post.media.length})</p>}
        {safeLink && post.link_url && <a href={post.link_url} className="block px-3 py-2 text-sm text-pink-300">{post.link_label || t('Apri collegamento')} →</a>}
      </div>}
      <div className="border-t border-white/10 px-3 py-1">
        <div className="flex flex-wrap items-start justify-between gap-x-3">
          <ShareButton title={post.caption.slice(0, 80)} url="/community" />
          <ReportButton targetType="POST" targetId={post.id} authorId={post.author_id} viewerId={viewerId} />
        </div>
      </div>
    </article>
  );
}

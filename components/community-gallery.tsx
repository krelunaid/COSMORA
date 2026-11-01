'use client';
/* User-uploaded videos do not yet support caption-file uploads. */
/* oxlint-disable jsx-a11y/media-has-caption */
import { useEffect, useRef, useState } from 'react';
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Heart,
  Images,
  MoreHorizontal,
  Play,
  X,
} from 'lucide-react';
import Image from 'next/image';
import Link from '@/components/app-link';
import { useI18n } from '@/components/i18n-provider';
import { CommunityAuthorLink } from '@/components/community-author-link';
import { ReportButton } from '@/components/report-button';
import { ShareButton } from '@/components/share-button';
import { AccountRequestError } from '@/lib/account-http';
import { viewerRequest } from '@/lib/viewer-request';
import { communityTranslator } from '@/lib/i18n/community';
import { communityGridMessages } from '@/lib/i18n/community-grid';
import { uiControls } from '@/lib/i18n/ui-controls';
import { communityThumbnail, postHashtags, type CommunityPost } from '@/lib/community-feed';

function PostImage({
  url,
  caption,
  detail = false,
  eager = false,
  fallbackUrl,
}: {
  url: string;
  caption: string;
  detail?: boolean;
  eager?: boolean;
  fallbackUrl?: string;
}) {
  const [failed, setFailed] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const { locale } = useI18n();
  return failed ? (
    <span className="grid h-full min-h-32 place-items-center p-4 text-center text-sm text-white/55">
      {communityGridMessages[locale].mediaFailed}
    </span>
  ) : (
    <Image
      unoptimized
      src={useFallback && fallbackUrl ? fallbackUrl : url}
      width={detail ? 800 : 300}
      height={detail ? 800 : 340}
      alt={caption}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => {
        if (!useFallback && fallbackUrl && fallbackUrl !== url) setUseFallback(true);
        else setFailed(true);
      }}
      className={
        detail ? 'h-full w-full object-contain' : 'h-full w-full object-cover'
      }
    />
  );
}

export function CommunityGrid({
  posts,
  onOpen,
}: {
  posts: CommunityPost[];
  onOpen: (id: string) => void;
}) {
  const { locale } = useI18n();
  const copy = communityGridMessages[locale];
  return (
    <ul
      aria-label={communityTranslator(locale)('Elenco post')}
      className="grid grid-cols-2 gap-x-3 gap-y-5"
    >
      {posts.map((post) => {
        const photo = post.media.find((media) => media.type !== 'VIDEO');
        const video = post.media.some((media) => media.type === 'VIDEO');
        return (
          <li key={post.id} className="min-w-0">
            <button
              type="button"
              onClick={() => onOpen(post.id)}
              aria-label={
                copy.open +
                ': ' +
                post.caption.slice(0, 100) +
                ' — ' +
                post.author
              }
              className="block w-full rounded-2xl text-left outline-offset-4 focus-visible:outline-2 focus-visible:outline-violet-300"
            >
              <span className="relative block aspect-[5/6] overflow-hidden rounded-2xl border border-white/10 bg-[#211b33]">
                {photo ? (
                  <PostImage
                    key={communityThumbnail(photo)}
                    url={communityThumbnail(photo)}
                    fallbackUrl={photo.url}
                    caption={post.caption.slice(0, 120)}
                  />
                ) : (
                  <span className="grid h-full place-content-center justify-items-center gap-3 p-3 text-center text-sm text-violet-200">
                    {video ? (
                      <Play className="size-9" aria-hidden />
                    ) : (
                      <Images className="size-9" aria-hidden />
                    )}
                    {video
                      ? communityTranslator(locale)('Video')
                      : copy.noImage}
                  </span>
                )}
                {post.media.length > 1 && (
                  <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-black/75 px-2 py-1 text-xs">
                    <Images className="size-3.5" aria-hidden />
                    {post.media.length}
                  </span>
                )}
                {post.saved && (
                  <span
                    aria-label={copy.savedPost}
                    className="absolute right-2 bottom-2 grid size-8 place-items-center rounded-full bg-violet-950/90 text-violet-200"
                  >
                    <Bookmark className="size-4 fill-current" aria-hidden />
                  </span>
                )}
              </span>
              <span className="mt-2 block line-clamp-2 break-words px-0.5 text-sm font-medium leading-snug text-white/90">
                {post.caption}
              </span>
              <span className="mt-1 block truncate px-0.5 text-xs text-white/55">
                {post.author}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function CommunityPostDetail({
  post,
  viewerId,
  onClose,
  onInteraction,
  onTag,
}: {
  post: CommunityPost;
  viewerId: string;
  onClose: () => void;
  onInteraction: (
    postId: string,
    action: 'like' | 'save',
    active: boolean,
  ) => void;
  onTag: (tag: string) => void;
}) {
  const { locale } = useI18n();
  const copy = communityGridMessages[locale],
    t = communityTranslator(locale);
  const dialog = useRef<HTMLDialogElement>(null);
  const mediaStrip = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const request = useRef<AbortController | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [needsLogin, setNeedsLogin] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const element = dialog.current;
    const oldOverflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      request.current?.abort();
      element?.close();
      document.body.style.overflow = oldOverflow;
    };
  }, []);

  async function interact(action: 'like' | 'save') {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError('');
    setNeedsLogin(false);
    setNotice('');
    const controller = new AbortController();
    request.current = controller;
    const active = !(action === 'like' ? post.liked : post.saved);
    try {
      const result = await viewerRequest<{
        postId: string;
        action: 'like' | 'save';
        active: boolean;
      }>('/api/community/posts/interaction', viewerId, {
        method: 'PUT',
        signal: controller.signal,
        body: JSON.stringify({ postId: post.id, action, active }),
      });
      if (controller.signal.aborted) return;
      if (
        result.postId !== post.id ||
        result.action !== action ||
        result.active !== active
      )
        throw new Error('Unexpected response');
      onInteraction(post.id, action, active);
      setNotice(
        action === 'like'
          ? active
            ? copy.likeNotice
            : copy.unlikeNotice
          : active
            ? copy.savedNotice
            : copy.unsavedNotice,
      );
    } catch (reason) {
      if (controller.signal.aborted) return;
      const login =
        reason instanceof AccountRequestError && reason.status === 401;
      setNeedsLogin(login);
      setError(login ? t('Accedi per continuare.') : copy.actionFailed);
    } finally {
      if (!controller.signal.aborted) {
        busy.current = false;
        setPending(false);
      }
    }
  }

  function scrollMedia(direction: number) {
    const strip = mediaStrip.current;
    if (strip)
      strip.scrollBy({
        left: direction * strip.clientWidth,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
      });
  }

  return (
    <dialog
      ref={dialog}
      data-community-post-dialog
      aria-labelledby="community-post-title"
      onClose={onClose}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-1.5rem)] max-w-[430px] overflow-y-auto rounded-3xl border border-white/15 bg-[#111021] p-0 text-white shadow-2xl backdrop:bg-black/85"
    >
      <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-white/10 bg-[#111021] px-4 py-2">
        <h2 id="community-post-title" className="text-base font-semibold">
          {copy.post}
        </h2>
        <button
          type="button"
          aria-label={copy.close}
          onClick={() => dialog.current?.close()}
          className="grid size-11 place-items-center rounded-full hover:bg-white/10"
        >
          <X className="size-5" aria-hidden />
        </button>
      </header>
      <div className="p-4">
        <div className="mb-4 flex items-start gap-3">
          <span
            aria-hidden
            className="grid size-10 shrink-0 place-items-center rounded-full bg-violet-500/20 font-semibold text-violet-200"
          >
            {post.author.slice(0, 1).toLocaleUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <CommunityAuthorLink
              authorId={post.author_id}
              author={post.author}
              profileUrl={post.author_profile_url}
              viewerId={viewerId}
            />
            <time
              dateTime={post.created_at}
              className="mt-1 block text-xs text-white/50"
            >
              {new Date(post.created_at).toLocaleString(locale, {
                dateStyle: 'short',
                timeStyle: 'short',
              })}
            </time>
          </div>
        </div>
        <div
          ref={mediaStrip}
          aria-label={uiControls[locale].carousel}
          className="flex snap-x snap-mandatory overflow-x-auto rounded-2xl bg-black/30"
        >
          {post.media.map((media, index) => (
            <div
              key={media.url + ':' + index}
              className="h-[min(52dvh,440px)] w-full shrink-0 snap-center"
            >
              {media.type === 'VIDEO' ? (
                <video
                  src={media.url}
                  controls
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-contain"
                />
              ) : (
                <PostImage
                  key={media.url}
                  url={media.url}
                  caption={post.caption.slice(0, 120)}
                  detail
                  eager={index === 0}
                />
              )}
            </div>
          ))}
        </div>
        {post.media.length > 1 && (
          <div className="flex items-center justify-between gap-2 text-xs text-white/60">
            <button
              type="button"
              aria-label={uiControls[locale].previousSlide}
              onClick={() => scrollMedia(-1)}
              className="grid size-11 place-items-center"
            >
              <ChevronLeft className="size-5" />
            </button>
            <span>
              {t('Scorri foto e video →')} ({post.media.length})
            </span>
            <button
              type="button"
              aria-label={uiControls[locale].nextSlide}
              onClick={() => scrollMedia(1)}
              className="grid size-11 place-items-center"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 py-2">
          <button
            type="button"
            disabled={pending}
            aria-pressed={post.liked === true}
            onClick={() => void interact('like')}
            className="flex min-h-11 items-center gap-1.5 text-sm text-pink-300 disabled:opacity-50"
          >
            <Heart
              className={`size-5 ${post.liked ? 'fill-current' : ''}`}
              aria-hidden
            />
            {post.liked ? copy.liked : copy.like}
          </button>
          <ShareButton title={post.caption.slice(0, 80)} url="/community" />
          <button
            type="button"
            disabled={pending}
            aria-pressed={post.saved === true}
            onClick={() => void interact('save')}
            className="flex min-h-11 items-center gap-1.5 text-sm text-violet-200 disabled:opacity-50"
          >
            <Bookmark
              className={`size-5 ${post.saved ? 'fill-current' : ''}`}
              aria-hidden
            />
            {post.saved ? copy.savedPost : copy.save}
          </button>
        </div>
        {error && (
          <div
            role="alert"
            className="mb-3 rounded-xl border border-rose-300/30 p-3 text-sm text-rose-200"
          >
            {error}
            {needsLogin && (
              <Link
                href="/auth/login"
                className="mt-1 flex min-h-11 items-center underline"
              >
                {t('Accedi')}
              </Link>
            )}
          </div>
        )}
        {notice && (
          <output className="mb-2 block text-xs text-white/65">{notice}</output>
        )}
        <p className="whitespace-pre-wrap break-words text-base leading-relaxed">
          {post.caption}
        </p>
        {!!postHashtags(post.caption).length && (
          <div className="mt-2 flex flex-wrap gap-x-3">
            {postHashtags(post.caption).map((tag) => (
              <button
                type="button"
                key={tag}
                onClick={() => onTag(tag)}
                className="min-h-11 text-sm text-violet-300"
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        <details className="mt-4 border-t border-white/10 pt-2">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm text-white/65">
            <MoreHorizontal className="size-5" aria-hidden />
            {copy.options}
          </summary>
          <div className="py-2">
            <ReportButton
              targetType="POST"
              targetId={post.id}
              authorId={post.author_id}
              viewerId={viewerId}
            />
          </div>
        </details>
      </div>
    </dialog>
  );
}

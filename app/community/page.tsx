'use client';
/* User-uploaded videos do not yet support caption-file uploads. */
/* oxlint-disable jsx-a11y/media-has-caption */
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from '@/components/app-link';
import { MobileShell, MobileNav } from '@/components/mobile-shell';
import { ShareButton } from '@/components/share-button';
import { ReportButton } from '@/components/report-button';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { accountRequest } from '@/lib/account-client';
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
  const [posts, setPosts] = useState<Post[]>([]);
  const [query, setQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [more, setMore] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(
      () => {
        setLoading(true);
        setError('');
        void (async () => {
          try {
            const session = await getSupabaseBrowserClient()?.auth.getSession();
            const token = session?.data.session?.access_token;
            const r = await fetch(
              '/api/community/posts?' +
                new URLSearchParams({ q: query, offset: String(offset) }),
              {
                signal: controller.signal,
                headers: token ? { Authorization: 'Bearer ' + token } : {},
              },
            );
            const value = (await r.json()) as {
              posts: Post[];
              hasMore: boolean;
              error?: string;
            };
            if (!r.ok) throw Error(value.error);
            if (!controller.signal.aborted) {
              setPosts((p) => (offset ? [...p, ...value.posts] : value.posts));
              setMore(value.hasMore);
            }
          } catch (e) {
            if (!controller.signal.aborted)
              setError(
                e instanceof Error ? e.message : 'Caricamento non riuscito.',
              );
          } finally {
            if (!controller.signal.aborted) setLoading(false);
          }
        })();
      },
      query ? 250 : 0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, offset, reload]);
  return (
    <MobileShell className="flex flex-col">
      <header className="flex items-center justify-between p-5">
        <h1 className="text-2xl font-semibold">Community</h1>
        <Link
          href="/community/create"
          className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold"
        >
          Nuovo post
        </Link>
      </header>
      <section className="flex-1 space-y-4 px-4 pb-5">
        <div className="flex gap-3">
          <Link
            href="/squads"
            className="flex min-h-11 items-center rounded-full border border-violet-400/30 px-4 text-sm text-violet-200"
          >
            Crew e incontri →
          </Link>
        </div>
        <input
          aria-label="Cerca nei post"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOffset(0);
          }}
          placeholder="Cerca nella community…"
          className="checkout-input"
        />
        {error && (
          <div role="alert">
            <p>{error}</p>
            <button
              onClick={() => setReload(reload + 1)}
              className="min-h-11 text-pink-300"
            >
              Riprova
            </button>
          </div>
        )}
        {!loading && !error && !posts.length && (
          <div className="rounded-2xl border border-white/10 p-6 text-center">
            <h2 className="text-xl font-semibold">
              Il prossimo post può essere il tuo
            </h2>
            <p className="mt-3 text-base text-white/70">
              Condividi un cosplay, una collezione o un momento a un evento.
            </p>
            <Link
              href="/community/create"
              className="mt-4 inline-block rounded-xl bg-violet-600 px-4 py-3"
            >
              Crea un post
            </Link>
          </div>
        )}
        {posts.map((post) => (
          <article
            key={post.id}
            className="overflow-hidden rounded-2xl border border-white/15 bg-[#111225]"
          >
            <div className="p-4">
              <Link
                href={'/profile/' + post.author_id}
                className="text-base font-semibold"
              >
                {post.author}
              </Link>
              <p className="mt-1 text-xs text-white/60">
                {new Date(post.created_at).toLocaleString('it-IT')}
              </p>
              <p className="mt-3 whitespace-pre-wrap break-words text-base leading-relaxed">
                {post.caption}
              </p>
            </div>
            <div className="flex snap-x snap-mandatory overflow-x-auto">
              {post.media.map((media, index) => (
                <div key={index} className="w-full shrink-0 snap-center">
                  {media.type === 'VIDEO' ? (
                    <video
                      src={media.url}
                      controls
                      playsInline
                      preload="metadata"
                      className="max-h-[480px] w-full"
                    />
                  ) : (
                    <Image
                      unoptimized
                      width={800}
                      height={800}
                      src={media.url}
                      alt={'Foto del post ' + (index + 1)}
                      loading="lazy"
                      className="max-h-[480px] w-full object-contain"
                    />
                  )}
                </div>
              ))}
            </div>
            {post.media.length > 1 && (
              <p className="p-3 text-sm text-white/65">
                Scorri le {post.media.length} foto e video →
              </p>
            )}
            {post.link_url &&
              (/^\/(?!\/)/.test(post.link_url) ||
                post.link_url.startsWith('https://')) && (
                <a
                  href={post.link_url}
                  className="block p-4 text-sm text-pink-300"
                >
                  {post.link_label} →
                </a>
              )}
            <div className="flex flex-wrap items-start justify-between gap-3 px-4">
              <ShareButton title={post.caption.slice(0, 80)} url="/community" />
              <ReportButton targetType="POST" targetId={post.id} />
              <button
                className="min-h-11 text-sm text-white/60"
                onClick={async () => {
                  try {
                    await accountRequest('/api/blocks', {
                      method: 'POST',
                      body: JSON.stringify({
                        userId: post.author_id,
                        blocked: true,
                      }),
                    });
                    setPosts((p) =>
                      p.filter((item) => item.author_id !== post.author_id),
                    );
                  } catch (e) {
                    setError(
                      e instanceof Error
                        ? e.message
                        : 'Operazione non riuscita.',
                    );
                  }
                }}
              >
                Blocca autore
              </button>
            </div>
          </article>
        ))}
        {loading && (
          <output className="py-4 text-white/70">Caricamento post…</output>
        )}
        {more && !loading && (
          <button
            onClick={() => setOffset(offset + 20)}
            className="min-h-12 w-full rounded-xl border border-white/20"
          >
            Mostra altri post
          </button>
        )}
      </section>
      <MobileNav active="home" />
    </MobileShell>
  );
}

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { moderateText } from '@/lib/community-moderation';
import {
  COMMUNITY_MEDIA_LIMIT_ERROR,
  MAX_COMMUNITY_MEDIA_BYTES,
  MAX_COMMUNITY_MEDIA_FILES,
  communityMediaStorageExtension,
  inferCommunityMediaType,
  isAllowedCommunityMediaType,
  isVideoMedia,
  sniffCommunityMediaType,
} from '@/lib/community-media';
import { PhotoPrivacyError, sanitizePhotoUploads } from '@/lib/photo-privacy';
import { applyReviewFixtureVisibility } from '@/lib/server/review-fixture-visibility';
import { isPublicProfileVisible } from '@/lib/server/public-profile-visibility';
import { readCommunityPostInteractions } from '@/lib/server/community-post-interactions';
import { getBlockedAuthorIds } from '@/lib/server/blocked-content';
import {
  getSupabaseAdmin,
  requireAuthenticatedUser,
} from '@/lib/supabase/server';

type FeedPost = {
  id: string;
  author_id: string;
  caption: string;
  country_code: string | null;
  language_code: string | null;
  created_at: string;
  link_label: string | null;
  link_url: string | null;
  post_categories: unknown;
  post_media: Array<{ storage_path: string; media_type: 'IMAGE' | 'VIDEO'; sort_order: number }>;
  saved_by?: unknown;
};

export async function GET(request: Request) {
  const admin = getSupabaseAdmin();
  if (!admin)
    return NextResponse.json(
      { error: 'Community non disponibile.' },
      { status: 503 },
    );
  const params = new URL(request.url).searchParams;
  const offset = Math.max(
    0,
    Math.min(10000, Number(params.get('offset')) || 0),
  );
  const auth = await requireAuthenticatedUser(request);
  const savedOnly = params.get('saved') === '1';
  if ((request.headers.has('authorization') || savedOnly) && !auth)
    return NextResponse.json({ error: 'Accedi per continuare.' }, { status: 401, headers: { 'Cache-Control': 'private, no-store' } });
  let query = admin
    .from('community_posts')
    .select(
      'id, author_id, caption, country_code, language_code, created_at, link_label, link_url, post_categories(label), post_media(storage_path,media_type,sort_order)' +
      (savedOnly ? ', saved_by:community_post_saves!inner(user_id)' : ''),
    )
    .eq('status', 'ACTIVE');
  // Inner join limits the main result set, before searching, sorting or paging.
  if (savedOnly && auth) query = query.eq('saved_by.user_id', auth.user.id);
  query = applyReviewFixtureVisibility(query, 'author_id', auth);
  if (params.get('q'))
    query = query.ilike(
      'caption',
      '%' + params.get('q')!.slice(0, 100).replace(/[%_]/g, '') + '%',
    );
  if (auth) {
    const blocks = await getBlockedAuthorIds(admin, auth.user.id);
    if (blocks.error)
      return NextResponse.json(
        { error: 'Community non disponibile.' },
        { status: 503 },
      );
    if (blocks.ids.length)
      query = query.not('author_id', 'in', '(' + blocks.ids.join(',') + ')');
  }
  const { data, error } = await query
    .order('created_at', { ascending: false })
    .order('id')
    .range(offset, offset + 19);
  if (error)
    return NextResponse.json(
      { error: 'Non è stato possibile caricare i post.' },
      { status: 503 },
    );
  const rows = (data ?? []) as unknown as FeedPost[];
  const ids = [...new Set(rows.map(row => row.author_id))];
  const profiles = ids.length
    ? await applyReviewFixtureVisibility(
        admin.from('profiles').select('id,display_name').eq('moderation_hidden', false).in('id', ids),
        'id',
        auth,
      )
    : { data: [], error: null };
  if (profiles.error)
    return NextResponse.json(
      { error: 'Non è stato possibile caricare gli autori dei post.' },
      { status: 503 },
    );
  const interactions = await readCommunityPostInteractions(admin, auth?.user.id, rows.map((post) => post.id));
  if (interactions.error)
    return NextResponse.json(
      { error: 'Non è stato possibile caricare i post. Riprova.' },
      { status: 503, headers: { 'Cache-Control': 'private, no-store' } },
    );
  const posts = await Promise.all(
    rows.map(async (post) => {
      const authorProfile = profiles.data?.find((p) => p.id === post.author_id);
      const media = post.post_media.sort((a, b) => a.sort_order - b.sort_order);
      const urls = media.length
        ? await admin.storage.from('community-media').createSignedUrls(
            media.map((item) => item.storage_path),
            3600,
          )
        : { data: [] };
      return {
        ...post,
        link_label: null,
        link_url: null,
        author: authorProfile?.display_name || 'Utente COSMORA',
        author_profile_url: authorProfile && isPublicProfileVisible(authorProfile.id)
          ? '/profile/' + authorProfile.id
          : null,
        post_media: undefined,
        saved_by: undefined,
        liked: interactions.likedIds.has(post.id),
        saved: interactions.savedIds.has(post.id),
        media: media
          .map((item, index) => ({
            type: item.media_type,
            url: urls.data?.[index]?.signedUrl || '',
          }))
          .filter((item) => item.url),
      };
    }),
  );
  return NextResponse.json(
    { posts, hasMore: posts.length === 20, userId: auth?.user.id },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

const schema = z.object({
  caption: z.string().trim().min(1).max(2000),
  category: z.string().trim().min(2).max(50),
});

async function resolveMediaType(item: File) {
  const inferred = inferCommunityMediaType(item);
  if (isAllowedCommunityMediaType(inferred)) return inferred;
  const header = new Uint8Array(await item.slice(0, 16).arrayBuffer());
  return sniffCommunityMediaType(header) || inferred;
}

function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function POST(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated)
    return NextResponse.json(
      { error: 'Accedi per pubblicare.' },
      { status: 401 },
    );

  const form = await request.formData();
  const parsed = schema.safeParse({
    caption: form.get('caption'),
    category: form.get('category'),
  });
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dati non validi.' },
      { status: 400 },
    );

  const media = form
    .getAll('media')
    .filter((item): item is File => item instanceof File && item.size > 0);
  if (media.reduce((total, file) => total + file.size, 0) > 32 * 1024 * 1024)
    return NextResponse.json({ error: 'Carica al massimo 32 MB complessivi per post.' }, { status: 413 });
  const mediaTypes = await Promise.all(
    media.map((item) => resolveMediaType(item)),
  );
  if (
    !media.length ||
    media.length > MAX_COMMUNITY_MEDIA_FILES ||
    media.some(
      (item, index) =>
        !isAllowedCommunityMediaType(mediaTypes[index] ?? '') ||
        item.size > MAX_COMMUNITY_MEDIA_BYTES,
    )
  ) {
    return NextResponse.json(
      {
        error: COMMUNITY_MEDIA_LIMIT_ERROR,
      },
      { status: 400 },
    );
  }

  const { admin, user } = authenticated;
  const recent = await admin
    .from('community_posts')
    .select('id', { count: 'exact', head: true })
    .eq('author_id', user.id)
    .gte('created_at', new Date(Date.now() - 3600000).toISOString());
  if (recent.error || (recent.count ?? 0) >= 20)
    return NextResponse.json(
      {
        error:
          'Pubblicazione momentaneamente non disponibile. Riprova più tardi.',
      },
      { status: 429 },
    );

  let uploadMedia: File[];
  try {
    uploadMedia = await sanitizePhotoUploads(media, mediaTypes);
  } catch (error) {
    return NextResponse.json({ error: error instanceof PhotoPrivacyError ? error.message : 'Una foto non è valida. Esportala di nuovo come JPEG, PNG o WebP e riprova.' }, { status: 400 });
  }

  const categorySlug = slugify(parsed.data.category);
  const category = await admin
    .from('post_categories')
    .upsert(
      { slug: categorySlug, label: parsed.data.category },
      { onConflict: 'slug' },
    )
    .select('id')
    .single();
  if (category.error)
    return NextResponse.json(
      { error: 'Categoria non disponibile.' },
      { status: 500 },
    );

  const signal = moderateText('Community post', parsed.data.caption);
  // Text heuristics are a review signal, never an approval of attached media.
  const moderation = { ...signal, status: 'PENDING_REVIEW' as const };
  const id = crypto.randomUUID();
  const post = await admin
    .from('community_posts')
    .insert({
      id,
      author_id: user.id,
      category_id: category.data.id,
      caption: parsed.data.caption,
      country_code: user.user_metadata?.country_code ?? null,
      language_code: user.user_metadata?.language_code ?? 'it',
      status: 'DRAFT',
      risk_score: signal.status === 'ACTIVE' ? 0 : 1,
      // Ignore legacy connection fields from older clients.
      link_type: null,
      link_label: null,
      link_url: null,
    })
    .select('id, status')
    .single();
  if (post.error)
    return NextResponse.json(
      { error: 'Pubblicazione non riuscita.' },
      { status: 500 },
    );

  const paths: string[] = [];
  try {
    for (const [index, item] of uploadMedia.entries()) {
      const type = mediaTypes[index] || item.type;
      const extension = communityMediaStorageExtension({
        name: item.name,
        type,
      });
      const path = `${user.id}/${id}/${index}-${crypto.randomUUID()}.${extension}`;
      const upload = await admin.storage
        .from('community-media')
        .upload(path, item, { contentType: type || item.type });
      if (upload.error) throw upload.error;
      paths.push(path);
    }
    const savedMedia = await admin.from('post_media').insert(
      paths.map((storagePath, index) => ({
        post_id: id,
        storage_path: storagePath,
        media_type: isVideoMedia({
          name: media[index]?.name ?? '',
          type: mediaTypes[index] || media[index]?.type || '',
        })
          ? 'VIDEO'
          : 'IMAGE',
        sort_order: index,
      })),
    );
    if (savedMedia.error) throw savedMedia.error;
    const activated = await admin
      .from('community_posts')
      .update({ status: moderation.status })
      .eq('id', id);
    if (activated.error) throw activated.error;
  } catch {
    if (paths.length) await admin.storage.from('community-media').remove(paths);
    await admin.from('community_posts').delete().eq('id', id);
    return NextResponse.json(
      { error: 'Caricamento dei contenuti non riuscito.' },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { post: { ...post.data, status: moderation.status }, moderation },
    { status: 201 },
  );
}

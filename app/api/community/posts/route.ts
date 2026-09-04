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
import { europeEvents } from '@/lib/events-data';
import {
  getSupabaseAdmin,
  requireAuthenticatedUser,
} from '@/lib/supabase/server';

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
  let query = admin
    .from('community_posts')
    .select(
      'id, author_id, caption, country_code, language_code, created_at, link_label, link_url, post_categories(label), post_media(storage_path,media_type,sort_order)',
    )
    .eq('status', 'ACTIVE');
  if (params.get('q'))
    query = query.ilike(
      'caption',
      '%' + params.get('q')!.slice(0, 100).replace(/[%_]/g, '') + '%',
    );
  if (auth) {
    const blocks = await admin
      .from('user_blocks')
      .select('blocker_id,blocked_id')
      .or(`blocker_id.eq.${auth.user.id},blocked_id.eq.${auth.user.id}`);
    if (blocks.error)
      return NextResponse.json(
        { error: 'Community non disponibile.' },
        { status: 503 },
      );
    const excluded = (blocks.data ?? []).map((row) =>
      row.blocker_id === auth.user.id ? row.blocked_id : row.blocker_id,
    );
    if (excluded.length)
      query = query.not('author_id', 'in', '(' + excluded.join(',') + ')');
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
  const ids = [...new Set((data ?? []).map((row) => row.author_id))];
  const profiles = ids.length
    ? await admin.from('profiles').select('id,display_name').in('id', ids)
    : { data: [] };
  const posts = await Promise.all(
    (data ?? []).map(async (post) => {
      const media = post.post_media.sort((a, b) => a.sort_order - b.sort_order);
      const urls = media.length
        ? await admin.storage.from('community-media').createSignedUrls(
            media.map((item) => item.storage_path),
            3600,
          )
        : { data: [] };
      return {
        ...post,
        author:
          profiles.data?.find((p) => p.id === post.author_id)?.display_name ||
          'Utente COSMORA',
        post_media: undefined,
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
  caption: z.string().trim().min(12).max(2000),
  category: z.string().trim().min(2).max(50),
  connectionType: z.enum(['event', 'product', 'creator', 'crew']).optional(),
  connection: z.string().trim().max(150).optional(),
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

async function resolveLink(
  admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  userId: string,
  type?: string,
  value?: string,
) {
  if (!type || !value) return {};
  if (type === 'event') {
    const event = europeEvents.find((e) => e.name === value);
    if (!event) throw Error('Evento non disponibile.');
    return {
      link_type: 'EVENT',
      link_label: event.name,
      link_url: event.internalUrl || event.url,
    };
  }
  if (!z.uuid().safeParse(value).success)
    throw Error('Collegamento non valido.');
  if (type === 'product') {
    const { data } = await admin
      .from('listings')
      .select('slug,title')
      .eq('id', value)
      .eq('seller_id', userId)
      .eq('status', 'active')
      .maybeSingle();
    if (!data) throw Error('Annuncio non disponibile.');
    return {
      link_type: 'PRODUCT',
      link_label: data.title,
      link_url: '/marketplace/' + data.slug,
    };
  }
  if (type === 'creator') {
    const { data } = await admin
      .from('profiles')
      .select('display_name')
      .eq('id', value)
      .maybeSingle();
    if (!data) throw Error('Profilo non disponibile.');
    return {
      link_type: 'CREATOR',
      link_label: data.display_name,
      link_url: '/profile/' + value,
    };
  }
  const { data } = await admin
    .from('squads')
    .select('name')
    .eq('id', value)
    .eq('status', 'ACTIVE')
    .eq('is_private', false)
    .maybeSingle();
  if (!data) throw Error('Crew non disponibile.');
  return {
    link_type: 'SQUAD',
    link_label: data.name,
    link_url: '/squads/' + value,
  };
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
    connectionType: form.get('connectionType') || undefined,
    connection: form.get('connection') || undefined,
  });
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dati non validi.' },
      { status: 400 },
    );

  const media = form
    .getAll('media')
    .filter((item): item is File => item instanceof File && item.size > 0);
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
  let connection;
  try {
    connection = await resolveLink(
      admin,
      user.id,
      parsed.data.connectionType,
      parsed.data.connection,
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Collegamento non valido.' },
      { status: 400 },
    );
  }
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

  const moderation = moderateText('Community post', parsed.data.caption);
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
      risk_score: moderation.status === 'ACTIVE' ? 0 : 1,
      ...connection,
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
    for (const [index, item] of media.entries()) {
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

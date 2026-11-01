import type { Env } from '../lib/supabase/server.ts';

import { z } from 'zod';

import { moderateText } from '../lib/community-moderation.ts';
import {
  COMMUNITY_MEDIA_LIMIT_ERROR,
  MAX_COMMUNITY_MEDIA_BYTES,
  MAX_COMMUNITY_MEDIA_FILES,
  communityMediaStorageExtension,
  inferCommunityMediaType,
  isAllowedCommunityMediaType,
  isVideoMedia,
  sniffCommunityMediaType,
} from '../lib/community-media.ts';
import { PhotoPrivacyError, sanitizePhotoUploads } from '../lib/photo-privacy.ts';
import {
  getSupabaseAdmin,
  requireAuthenticatedUser,
} from '../lib/supabase/server.ts';

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

export async function POST(request: Request, env: Env) {
  const authenticated = await requireAuthenticatedUser(request, env);
  if (!authenticated)
    return Response.json(
      { error: 'Accedi per pubblicare.' },
      { status: 401 },
    );

  const form = await request.formData();
  const parsed = schema.safeParse({
    caption: form.get('caption'),
    category: form.get('category'),
  });
  if (!parsed.success)
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? 'Dati non validi.' },
      { status: 400 },
    );

  const media = form
    .getAll('media')
    .filter((item): item is File => item instanceof File && item.size > 0);
  if (media.reduce((total, file) => total + file.size, 0) > 32 * 1024 * 1024)
    return Response.json({ error: 'Carica al massimo 32 MB complessivi per post.' }, { status: 413 });
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
    return Response.json(
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
    return Response.json(
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
    return Response.json({ error: error instanceof PhotoPrivacyError ? error.message : 'Una foto non è valida. Esportala di nuovo come JPEG, PNG o WebP e riprova.' }, { status: 400 });
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
    return Response.json(
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
    return Response.json(
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
    return Response.json(
      { error: 'Caricamento dei contenuti non riuscito.' },
      { status: 500 },
    );
  }

  return Response.json(
    { post: { ...post.data, status: moderation.status }, moderation },
    { status: 201 },
  );
}

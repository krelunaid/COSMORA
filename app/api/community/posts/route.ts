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
import { requireAuthenticatedUser } from '@/lib/supabase/server';

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

function resolveLink(type?: string, label?: string) {
  if (!type || !label) return {};
  if (type === 'event') {
    const event = europeEvents.find((item) => item.name === label);
    return {
      link_type: 'EVENT',
      link_label: label,
      link_url: event?.internalUrl ?? event?.url ?? null,
    };
  }
  if (type === 'product') {
    return {
      link_type: 'PRODUCT',
      link_label: label,
      link_url: label.startsWith('Raiden')
        ? '/marketplace/raiden-shogun-cosplay'
        : '/commissions/new',
    };
  }
  if (type === 'creator') {
    return {
      link_type: 'CREATOR',
      link_label: label,
      link_url: '/profile/stardust-atelier',
    };
  }
  return {
    link_type: 'SQUAD',
    link_label: label,
    link_url: label.startsWith('One Piece')
      ? '/squads/one-piece-crew-lucca-2026'
      : '/squads/lucca-night-photo-meetup',
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
      status: moderation.status === 'ACTIVE' ? 'ACTIVE' : 'PENDING_REVIEW',
      risk_score: moderation.status === 'ACTIVE' ? 0 : 1,
      ...resolveLink(parsed.data.connectionType, parsed.data.connection),
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
  } catch {
    if (paths.length) await admin.storage.from('community-media').remove(paths);
    await admin.from('community_posts').delete().eq('id', id);
    return NextResponse.json(
      { error: 'Caricamento dei contenuti non riuscito.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ post: post.data, moderation }, { status: 201 });
}

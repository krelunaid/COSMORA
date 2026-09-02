import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAuthenticatedUser } from '@/lib/supabase/server';

const listingSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(5000),
  category: z.string().trim().min(2).max(60),
  condition: z.string().trim().min(2).max(30),
  saleMode: z.enum(['buy', 'rent', 'both']),
  salePrice: z.coerce.number().min(0).optional(),
  rentalPrice: z.coerce.number().min(0).optional(),
  rentalDays: z.coerce.number().int().min(1).optional(),
  deposit: z.coerce.number().min(0).default(0),
});

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maxBytes = 10 * 1024 * 1024;

function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 70);
}

function cents(value?: number) {
  return value === undefined ? null : Math.round(value * 100);
}

export async function POST(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json(
      { error: 'Accedi per pubblicare un annuncio.' },
      { status: 401 },
    );
  }

  const form = await request.formData();
  const parsed = listingSchema.safeParse({
    title: form.get('title'),
    description: form.get('description'),
    category: form.get('category'),
    condition: form.get('condition'),
    saleMode: form.get('saleMode'),
    salePrice: form.get('salePrice') || undefined,
    rentalPrice: form.get('rentalPrice') || undefined,
    rentalDays: form.get('rentalDays') || undefined,
    deposit: form.get('deposit') || 0,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dati non validi.' },
      { status: 400 },
    );
  }

  const photos = form
    .getAll('photos')
    .filter((photo): photo is File => photo instanceof File && photo.size > 0);
  if (!photos.length || photos.length > 8) {
    return NextResponse.json(
      { error: 'Inserisci da 1 a 8 foto.' },
      { status: 400 },
    );
  }
  if (
    photos.some(
      (photo) => !allowedTypes.has(photo.type) || photo.size > maxBytes,
    )
  ) {
    return NextResponse.json(
      { error: 'Le foto devono essere JPG, PNG o WebP e non superare 10 MB.' },
      { status: 400 },
    );
  }

  const { admin, user } = authenticated;
  const data = parsed.data;
  if (data.saleMode !== 'rent' && data.salePrice === undefined) {
    return NextResponse.json(
      { error: 'Inserisci il prezzo di vendita.' },
      { status: 400 },
    );
  }
  if (data.saleMode !== 'buy' && (!data.rentalPrice || !data.rentalDays)) {
    return NextResponse.json(
      { error: 'Inserisci prezzo e durata del noleggio.' },
      { status: 400 },
    );
  }

  const id = crypto.randomUUID();
  const slug = `${slugify(data.title) || 'annuncio'}-${id.slice(0, 8)}`;
  const inserted = await admin
    .from('listings')
    .insert({
      id,
      seller_id: user.id,
      slug,
      title: data.title,
      description: data.description,
      category: data.category,
      condition: data.condition,
      sale_mode: data.saleMode,
      sale_price_cents: data.saleMode === 'rent' ? null : cents(data.salePrice),
      rental_price_cents:
        data.saleMode === 'buy' ? null : cents(data.rentalPrice),
      rental_days: data.saleMode === 'buy' ? null : data.rentalDays,
      deposit_cents: data.saleMode === 'buy' ? 0 : (cents(data.deposit) ?? 0),
      status: 'active',
    })
    .select('id, slug')
    .single();
  if (inserted.error) {
    return NextResponse.json(
      { error: 'Impossibile creare l’annuncio.' },
      { status: 500 },
    );
  }

  const uploadedPaths: string[] = [];
  try {
    for (const [position, photo] of photos.entries()) {
      const extension =
        photo.type === 'image/png'
          ? 'png'
          : photo.type === 'image/webp'
            ? 'webp'
            : 'jpg';
      const path = `${user.id}/${id}/${position}-${crypto.randomUUID()}.${extension}`;
      const upload = await admin.storage
        .from('listing-images')
        .upload(path, photo, {
          contentType: photo.type,
          upsert: false,
        });
      if (upload.error) throw upload.error;
      uploadedPaths.push(path);
    }

    const imageRows = uploadedPaths.map((storagePath, position) => ({
      listing_id: id,
      storage_path: storagePath,
      position,
      is_background_removed: form.get(`photoProcessed:${position}`) === 'true',
    }));
    const imageInsert = await admin.from('listing_images').insert(imageRows);
    if (imageInsert.error) throw imageInsert.error;
  } catch {
    if (uploadedPaths.length)
      await admin.storage.from('listing-images').remove(uploadedPaths);
    await admin.from('listings').delete().eq('id', id);
    return NextResponse.json(
      { error: 'Caricamento foto non riuscito. Riprova.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ listing: inserted.data }, { status: 201 });
}

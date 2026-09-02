import { NextResponse } from 'next/server';

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maxBytes = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const apiKey = process.env.REMOVE_BG_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Lo scontorno automatico non è ancora configurato.' },
      { status: 503 },
    );
  }

  const input = await request.formData();
  const image = input.get('image');
  if (!(image instanceof File) || !allowedTypes.has(image.type)) {
    return NextResponse.json(
      { error: 'Carica una foto JPG, PNG o WebP.' },
      { status: 400 },
    );
  }
  if (image.size > maxBytes) {
    return NextResponse.json(
      { error: 'La foto non può superare 10 MB.' },
      { status: 413 },
    );
  }

  const payload = new FormData();
  payload.append('image_file', image, image.name);
  payload.append('size', 'auto');

  const response = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: { 'X-Api-Key': apiKey },
    body: payload,
  });

  if (!response.ok) {
    return NextResponse.json(
      {
        error:
          'Non è stato possibile scontornare questa foto. Usa l’originale o riprova.',
      },
      { status: response.status === 402 ? 503 : 502 },
    );
  }

  return new Response(await response.arrayBuffer(), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'private, no-store',
    },
  });
}

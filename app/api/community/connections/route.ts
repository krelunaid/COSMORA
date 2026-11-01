import { NextResponse } from 'next/server';

/** Retired: community posts use caption hashtags, not content associations. */
export async function GET() {
  return NextResponse.json({ options: [], error: 'Usa gli hashtag nella descrizione del post.' }, {
    status: 410, headers: { 'Cache-Control': 'private, no-store' },
  });
}

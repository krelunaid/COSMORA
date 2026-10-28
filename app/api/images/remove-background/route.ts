import { NextResponse } from 'next/server';

// The supported UI processes images locally. This retired endpoint must never
// forward a user's image to an external service, even if a legacy key exists.
export async function POST() {
  return NextResponse.json(
    { error: 'Questo servizio non è più disponibile. Usa lo scontorno locale nell’app.' },
    { status: 410, headers: { 'Cache-Control': 'no-store' } },
  );
}

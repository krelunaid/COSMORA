import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  calculateMarketplaceQuote,
  PLATFORM_FEE_RULES,
} from '@/lib/monetization';

const quoteSchema = z.object({
  kind: z.enum(['sale', 'rental', 'commission']),
  amountCents: z.number().int().positive().max(100_000_000),
  depositCents: z.number().int().min(0).max(100_000_000).optional(),
});

export async function GET() {
  return NextResponse.json({ currency: 'EUR', rules: PLATFORM_FEE_RULES });
}

export async function POST(request: Request) {
  const parsed = quoteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid quote request' },
      { status: 400 },
    );
  }

  return NextResponse.json(calculateMarketplaceQuote(parsed.data));
}

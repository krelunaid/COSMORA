import { NextResponse } from 'next/server';

import { PLATFORM_FEE_RULES } from '@/lib/monetization';

export async function GET() {
  return NextResponse.json({
    provider: 'stripe-connect',
    configured: Boolean(
      process.env.STRIPE_SECRET_KEY &&
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    ),
    connectConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
    webhookConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    currency: 'EUR',
    rules: PLATFORM_FEE_RULES,
  });
}

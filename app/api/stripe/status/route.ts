import { NextResponse } from 'next/server';

import { PLATFORM_FEE_RULES } from '@/lib/monetization';
import { getStripe } from '@/lib/stripe/server';

export async function GET() {
  return NextResponse.json({
    provider: 'stripe-connect',
    configured: Boolean(
      getStripe() &&
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    ),
    connectConfigured: Boolean(getStripe()),
    livePaymentsEnabled: false,
    webhookConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    currency: 'EUR',
    rules: PLATFORM_FEE_RULES,
  });
}

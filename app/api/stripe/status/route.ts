import { NextResponse } from 'next/server';

import { PLATFORM_FEE_RULES } from '@/lib/monetization';
import { getStripe } from '@/lib/stripe/server';
import { paymentsEnabled } from '@/lib/release-features';

export async function GET() {
  return NextResponse.json({
    provider: 'stripe-connect',
    configured: Boolean(paymentsEnabled && getStripe() && process.env.STRIPE_WEBHOOK_SECRET),
    mode: 'test',
    testPaymentsEnabled: paymentsEnabled,
    connectConfigured: Boolean(getStripe()),
    livePaymentsEnabled: false,
    webhookConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    currency: 'EUR',
    rules: PLATFORM_FEE_RULES,
  });
}

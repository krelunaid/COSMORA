import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAuthenticatedUser } from '@/lib/supabase/server';
import { getAppUrl, getStripe } from '@/lib/stripe/server';

const schema = z.object({
  country: z.string().length(2).default('IT'),
  sellerType: z.enum(['private', 'shop']).default('private'),
});

export async function POST(request: Request) {
  const stripe = getStripe();
  const authenticated = await requireAuthenticatedUser(request);
  if (!stripe || !authenticated) {
    return NextResponse.json(
      { error: 'Autenticazione o Stripe non configurati.' },
      { status: 503 },
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dati venditore non validi.' },
      { status: 400 },
    );
  }

  const { admin, user } = authenticated;
  const existing = await admin
    .from('seller_payment_accounts')
    .select('stripe_account_id')
    .eq('user_id', user.id)
    .maybeSingle();

  let accountId = existing.data?.stripe_account_id ?? null;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      country: parsed.data.country,
      email: user.email,
      business_type:
        parsed.data.sellerType === 'shop' ? 'company' : 'individual',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: { cosmora_user_id: user.id },
    });
    accountId = account.id;
    const saved = await admin.from('seller_payment_accounts').upsert({
      user_id: user.id,
      stripe_account_id: account.id,
      account_type: 'express',
      country: parsed.data.country,
      updated_at: new Date().toISOString(),
    });
    if (saved.error) {
      return NextResponse.json(
        { error: 'Impossibile salvare il conto.' },
        { status: 500 },
      );
    }
  }

  const appUrl = getAppUrl(request);
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${appUrl}/seller/onboarding?stripe=refresh`,
    return_url: `${appUrl}/seller/onboarding?stripe=complete`,
    type: 'account_onboarding',
  });

  return NextResponse.json({ url: accountLink.url });
}

export async function GET(request: Request) {
  const stripe = getStripe();
  const authenticated = await requireAuthenticatedUser(request);
  if (!stripe || !authenticated) {
    return NextResponse.json({ configured: false }, { status: 503 });
  }
  const { admin, user } = authenticated;
  const stored = await admin
    .from('seller_payment_accounts')
    .select('stripe_account_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!stored.data?.stripe_account_id) {
    return NextResponse.json({ configured: true, connected: false });
  }
  const account = await stripe.accounts.retrieve(stored.data.stripe_account_id);
  await admin
    .from('seller_payment_accounts')
    .update({
      details_submitted: account.details_submitted,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);
  return NextResponse.json({
    configured: true,
    connected: account.details_submitted,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
  });
}

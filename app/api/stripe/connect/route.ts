import { NextResponse } from 'next/server';
import { paymentsEnabled } from '@/lib/release-features';

import { requireAuthenticatedUser } from '@/lib/supabase/server';
import { getAppUrl, getStripe } from '@/lib/stripe/server';

export async function POST(request: Request) {
  if (!paymentsEnabled) return NextResponse.json({ error: 'I pagamenti non sono disponibili in questa versione di COSMORA.' }, { status: 403 });
  const stripe = getStripe();
  const authenticated = await requireAuthenticatedUser(request);
  if (!stripe || !authenticated) {
    return NextResponse.json(
      { error: 'Autenticazione o Stripe non configurati.' },
      { status: 503 },
    );
  }

  const seller = await authenticated.admin
    .from('seller_details')
    .select('country_code,seller_type,details')
    .eq('user_id', authenticated.user.id)
    .maybeSingle();
  if (seller.error || !seller.data) {
    return NextResponse.json(
      { error: 'Salva prima il profilo venditore.' },
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
  if (existing.error)
    return NextResponse.json(
      { error: 'Conto non disponibile. Riprova.' },
      { status: 503 },
    );
  if (!accountId) {
    const account = await stripe.accounts.create(
      {
        type: 'express',
        country: seller.data.country_code,
        email: user.email,
        business_type:
          seller.data.seller_type === 'shop' &&
          seller.data.details.businessType === 'company'
            ? 'company'
            : 'individual',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { cosmora_user_id: user.id },
      },
      {
        idempotencyKey:
          'cosmora-connect-' +
          user.id +
          '-' +
          seller.data.country_code +
          '-' +
          seller.data.details.businessType,
      },
    );
    accountId = account.id;
    const saved = await admin.from('seller_payment_accounts').upsert({
      user_id: user.id,
      stripe_account_id: account.id,
      account_type: 'express',
      country: seller.data.country_code,
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

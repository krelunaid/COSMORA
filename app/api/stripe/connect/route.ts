import { NextResponse } from 'next/server';
import { paymentsEnabled } from '@/lib/release-features';

import { requireAuthenticatedUser } from '@/lib/supabase/server';
import { getAppUrl, getStripe } from '@/lib/stripe/server';
import {
  assessTestConnectAccount,
  assessTestV2ConnectAccount,
  connectOnboardingReadiness,
  EXPECTED_STRIPE_PLATFORM_ACCOUNT_ID,
  CONNECT_ACCOUNT_TYPE,
  CONNECT_MODEL_APPROVED,
  CONNECT_ONBOARDING_ENABLED,
} from '@/lib/stripe/connect-config';
import {
  createTestConnectLink, ensureTestConnectAccount, readTestConnectAccount, TestConnectError, validateTestConnectReturnUrl,
} from '@/lib/stripe/connect-onboarding';

async function createConnection(request: Request) {
  if (!paymentsEnabled) return NextResponse.json({ error: 'I pagamenti non sono disponibili in questa versione di COSMORA.' }, { status: 403 });
  if (!CONNECT_MODEL_APPROVED || !CONNECT_ONBOARDING_ENABLED) return NextResponse.json({
    error: 'La configurazione degli incassi non è ancora disponibile.',
    code: 'CONNECT_MODEL_NOT_APPROVED', ...connectOnboardingReadiness(),
  }, { status: 403 });
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: 'Accedi per continuare.' }, { status: 401 });
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'Stripe di prova non disponibile.' }, { status: 503 });
  const { admin, user } = authenticated;
  const existing = await admin.from('seller_payment_accounts').select('stripe_account_id,account_type')
    .eq('user_id', user.id).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data?.stripe_account_id && existing.data.account_type !== CONNECT_ACCOUNT_TYPE) {
    throw new TestConnectError('CONNECT_LEGACY_ACCOUNT_UNSUPPORTED', 'Il conto esistente richiede una verifica. Nessun altro conto è stato creato.');
  }
  const seller = await admin.from('seller_details').select('seller_type,country_code,details')
    .eq('user_id', user.id).maybeSingle();
  if (seller.error) throw seller.error;
  if (!seller.data) return NextResponse.json({ error: 'Salva prima il profilo venditore.' }, { status: 400 });
  // APP_URL must be an explicit HTTPS return origin; do not derive onboarding URLs from the request host.
  if (!process.env.APP_URL) throw new TestConnectError('CONNECT_RETURN_URL_INVALID', 'Indirizzo di ritorno degli incassi non configurato.', 503);
  const appUrl = getAppUrl();
  validateTestConnectReturnUrl(appUrl);
  const account = await ensureTestConnectAccount(admin, stripe, user.id, seller.data);
  if (existing.data?.stripe_account_id && existing.data.stripe_account_id !== account.id) {
    throw new TestConnectError('CONNECT_ACCOUNT_MISMATCH', 'Conto incassi non corrispondente. È necessaria una verifica.');
  }
  const url = await createTestConnectLink(stripe, account.id, appUrl);
  return NextResponse.json({ url, isTest: true });
}

async function readConnection(request: Request) {
  const stripe = getStripe();
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: 'Accedi per continuare.' }, { status: 401 });
  if (!stripe) {
    return NextResponse.json({ configured: false, ...connectOnboardingReadiness() }, { status: 503 });
  }
  const { admin, user } = authenticated;
  const stored = await admin
    .from('seller_payment_accounts')
    .select('stripe_account_id,account_type')
    .eq('user_id', user.id)
    .maybeSingle();
  if (stored.error) throw stored.error;
  // Recover a lost create/bind response from the saved request metadata; GET never creates Stripe objects.
  const v2 = !stored.data?.stripe_account_id || stored.data.account_type === CONNECT_ACCOUNT_TYPE
    ? await readTestConnectAccount(admin, stripe, user.id) : null;
  const accountId = stored.data?.stripe_account_id ?? v2?.id;
  if (!accountId) {
    return NextResponse.json({ configured: true, connected: false, ...connectOnboardingReadiness() });
  }
  if (stored.data?.account_type === CONNECT_ACCOUNT_TYPE && (!v2 || v2.id !== accountId)) {
    throw new TestConnectError('CONNECT_ACCOUNT_MISMATCH', 'Conto incassi non corrispondente. È necessaria una verifica.');
  }
  if (v2) {
    // readTestConnectAccount already verified this platform and the frozen seller
    // identity/plan. Use the explicit v2 capabilities, never legacy controller fields.
    const readiness = assessTestV2ConnectAccount(v2);
    const merchantPaymentsActive = v2.configuration?.merchant?.capabilities?.card_payments?.status === 'active';
    const merchantPayoutsActive = v2.configuration?.merchant?.capabilities?.stripe_balance?.payouts?.status === 'active';
    const saved = await admin.from('seller_payment_accounts').update({
      charges_enabled: merchantPaymentsActive,
      payouts_enabled: merchantPayoutsActive,
      updated_at: new Date().toISOString(),
    }).eq('user_id', user.id).eq('stripe_account_id', v2.id).eq('account_type', CONNECT_ACCOUNT_TYPE)
      .select('user_id').maybeSingle();
    if (saved.error || !saved.data) throw new TestConnectError('CONNECT_STORAGE_UNAVAILABLE', 'Configurazione incassi non verificata. Riprova.', 503);
    return NextResponse.json({
      configured: true,
      connected: true, // Verified binding; payment readiness remains a separate result.
      chargesEnabled: readiness.paymentsReady && merchantPaymentsActive,
      payoutsEnabled: readiness.paymentsReady && merchantPayoutsActive,
      ...readiness,
      stripeStatus: { merchantPaymentsActive, merchantPayoutsActive, requirementsRetrieved: v2.requirements != null },
    });
  }
  // A test-key prefix does not establish account ownership. Never inspect another platform's seller.
  const platform = await stripe.accounts.retrieve(null);
  if (platform.id !== EXPECTED_STRIPE_PLATFORM_ACCOUNT_ID) {
    return NextResponse.json({
      configured: false, connected: false, code: 'STRIPE_PLATFORM_MISMATCH',
      ...connectOnboardingReadiness(),
    }, { status: 503 });
  }
  // Existing legacy accounts are visible for diagnosis only and can never be ready.
  const account = await stripe.accounts.retrieve(accountId);
  const readiness = assessTestConnectAccount(account);
  const saved = await admin
    .from('seller_payment_accounts')
    .update({
      details_submitted: account.details_submitted,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id).eq('stripe_account_id', accountId);
  if (saved.error) throw saved.error;
  return NextResponse.json({
    configured: true,
    connected: account.details_submitted,
    chargesEnabled: readiness.paymentsReady && account.charges_enabled,
    payoutsEnabled: readiness.paymentsReady && account.payouts_enabled,
    ...readiness,
    stripeStatus: {
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    },
  });
}

async function safely(request: Request, action: (request: Request) => Promise<NextResponse>) {
  try {
    const response = await action(request);
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch (error) {
    if (error instanceof TestConnectError) return NextResponse.json({ error: error.message, code: error.code }, {
      status: error.status, headers: { 'Cache-Control': 'private, no-store' },
    });
    return NextResponse.json({ error: 'Verifica Stripe non disponibile. Riprova senza creare un altro account.' }, {
      status: 503, headers: { 'Cache-Control': 'private, no-store' },
    });
  }
}
export async function POST(request: Request) { return safely(request, createConnection); }
export async function GET(request: Request) { return safely(request, readConnection); }

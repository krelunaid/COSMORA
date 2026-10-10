import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { paymentsEnabled } from '@/lib/release-features';
import { getStripe, STRIPE_API_VERSION } from '@/lib/stripe/server';
import {
  CONNECT_MODEL_APPROVED, CONNECT_ONBOARDING_ENABLED, CONNECT_MODEL_VERSION,
  EXPECTED_STRIPE_PLATFORM_ACCOUNT_ID,
} from '@/lib/stripe/connect-config';

const table = 'test_connect_onboarding_requests';
const retryWindowMs = 23 * 60 * 60 * 1000;
const includes: Stripe.V2.Core.AccountRetrieveParams['include'] = [
  'configuration.merchant', 'identity', 'defaults', 'requirements',
];
const createBodySchema = z.object({
  contact_email: z.email(),
  display_name: z.string().min(2).max(100),
  dashboard: z.literal('full'),
  identity: z.object({ country: z.string().regex(/^[A-Z]{2}$/), entity_type: z.enum(['individual', 'company']) }).strict(),
  configuration: z.object({ merchant: z.object({ capabilities: z.object({
    card_payments: z.object({ requested: z.literal(true) }).strict(),
  }).strict() }).strict() }).strict(),
  defaults: z.object({ responsibilities: z.object({
    fees_collector: z.literal('stripe'), losses_collector: z.literal('stripe'),
  }).strict() }).strict(),
  include: z.tuple([z.literal('configuration.merchant'), z.literal('identity'), z.literal('defaults'), z.literal('requirements')]),
  metadata: z.object({
    cosmora_user_id: z.uuid(), cosmora_connect_request_id: z.uuid(),
    cosmora_connect_model: z.literal(CONNECT_MODEL_VERSION),
    cosmora_platform_account_id: z.literal(EXPECTED_STRIPE_PLATFORM_ACCOUNT_ID),
    cosmora_mode: z.literal('test'),
  }).strict(),
}).strict();
const planSchema = z.object({
  id: z.uuid(), user_id: z.uuid(),
  platform_account_id: z.literal(EXPECTED_STRIPE_PLATFORM_ACCOUNT_ID),
  api_version: z.literal(STRIPE_API_VERSION), model_version: z.literal(CONNECT_MODEL_VERSION),
  state: z.enum(['prepared', 'creating', 'manual_review', 'bound']),
  first_attempt_at: z.string().nullable(), stripe_account_id: z.string().startsWith('acct_').nullable(),
  request_body: createBodySchema,
});
type ConnectPlan = z.infer<typeof planSchema>;
export type ConnectSeller = { seller_type: string; country_code: string; details: Record<string, unknown> };

export class TestConnectError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 409) {
    super(message);
    this.name = 'TestConnectError';
  }
}

function parsePlan(value: unknown, userId: string): ConnectPlan {
  const parsed = planSchema.safeParse(value);
  if (!parsed.success || parsed.data.user_id !== userId ||
      parsed.data.request_body.metadata.cosmora_user_id !== userId ||
      parsed.data.request_body.metadata.cosmora_connect_request_id !== parsed.data.id ||
      (parsed.data.state === 'bound') !== Boolean(parsed.data.stripe_account_id) ||
      (parsed.data.state !== 'prepared' && !parsed.data.first_attempt_at)) {
    throw new TestConnectError('CONNECT_PLAN_INVALID', 'Configurazione incassi da verificare. Non creare un altro conto.', 503);
  }
  return parsed.data;
}

async function planRpc(admin: SupabaseClient, name: string, args: Record<string, unknown>, userId: string) {
  const result = await admin.rpc(name, args);
  if (result.error) throw new TestConnectError('CONNECT_STORAGE_UNAVAILABLE', 'Configurazione incassi non verificata. Riprova senza creare un altro conto.', 503);
  return parsePlan(result.data, userId);
}

async function readPlan(admin: SupabaseClient, userId: string) {
  const result = await admin.from(table).select('*').eq('user_id', userId).maybeSingle();
  if (result.error) throw new TestConnectError('CONNECT_STORAGE_UNAVAILABLE', 'Configurazione incassi non disponibile. Riprova.', 503);
  return result.data ? parsePlan(result.data, userId) : null;
}

export async function assertExpectedTestPlatform(stripe: Stripe) {
  if (getStripe() !== stripe) {
    throw new TestConnectError('CONNECT_TEST_CLIENT_REQUIRED', 'Stripe di prova non disponibile.', 503);
  }
  const platform = await stripe.accounts.retrieve(null);
  if (platform.id !== EXPECTED_STRIPE_PLATFORM_ACCOUNT_ID) {
    throw new TestConnectError('STRIPE_PLATFORM_MISMATCH', 'Configurazione incassi non disponibile.', 503);
  }
}

/** Explicit v2 values, requested with include; no assumptions based on a legacy account type. */
function assertAccountMatchesPlan(account: Stripe.V2.Core.Account, plan: ConnectPlan) {
  if (account.livemode || account.closed || account.id === plan.platform_account_id ||
      account.dashboard !== 'full' || !account.applied_configurations.includes('merchant') ||
      !account.configuration?.merchant || account.defaults?.responsibilities?.fees_collector !== 'stripe' ||
      account.defaults?.responsibilities?.losses_collector !== 'stripe' ||
      account.identity?.country?.toUpperCase() !== plan.request_body.identity.country ||
      account.identity?.entity_type !== plan.request_body.identity.entity_type ||
      account.metadata?.cosmora_user_id !== plan.user_id ||
      account.metadata?.cosmora_connect_request_id !== plan.id ||
      account.metadata?.cosmora_connect_model !== plan.model_version ||
      account.metadata?.cosmora_platform_account_id !== plan.platform_account_id ||
      account.metadata?.cosmora_mode !== 'test' ||
      (plan.stripe_account_id && account.id !== plan.stripe_account_id)) {
    throw new TestConnectError('CONNECT_ACCOUNT_MISMATCH', 'Conto incassi non corrispondente. È necessaria una verifica.', 409);
  }
}

async function retrieveAccount(stripe: Stripe, id: string, plan: ConnectPlan) {
  const account = await stripe.v2.core.accounts.retrieve(id, { include: includes }, { apiVersion: plan.api_version });
  assertAccountMatchesPlan(account, plan);
  return account;
}

async function bindAccount(admin: SupabaseClient, plan: ConnectPlan, account: Stripe.V2.Core.Account) {
  assertAccountMatchesPlan(account, plan);
  await planRpc(admin, 'cosmora_bind_test_connect', {
    p_user_id: plan.user_id, p_request_id: plan.id, p_account_id: account.id,
  }, plan.user_id);
  return account;
}

/** v2 list has no metadata filter. Scan completely within a bound; never infer absence from a truncated list. */
async function findCreatedAccount(stripe: Stripe, plan: ConnectPlan) {
  let foundId: string | null = null;
  let inspected = 0;
  for await (const account of stripe.v2.core.accounts.list({ applied_configurations: ['merchant'], limit: 100 })) {
    if (++inspected > 1000) throw new TestConnectError('CONNECT_RECOVERY_LIMIT', 'Recupero del conto da completare con l’assistenza. Non creare un altro conto.');
    if (account.metadata?.cosmora_connect_request_id !== plan.id) continue;
    if (foundId && foundId !== account.id) throw new TestConnectError('CONNECT_DUPLICATE_HISTORY', 'Risultano più conti per lo stesso tentativo. È necessaria una verifica.');
    if (account.livemode || account.metadata.cosmora_user_id !== plan.user_id ||
        account.metadata.cosmora_platform_account_id !== plan.platform_account_id ||
        account.metadata.cosmora_connect_model !== plan.model_version || account.metadata.cosmora_mode !== 'test') {
      throw new TestConnectError('CONNECT_ACCOUNT_MISMATCH', 'Conto incassi non corrispondente. È necessaria una verifica.');
    }
    foundId = account.id;
  }
  return foundId ? retrieveAccount(stripe, foundId, plan) : null;
}

/** Read-only on Stripe. A recovered account is bound locally, never recreated or reconfigured. */
export async function readTestConnectAccount(admin: SupabaseClient, stripe: Stripe, userId: string) {
  const plan = await readPlan(admin, userId);
  if (!plan) return null;
  await assertExpectedTestPlatform(stripe);
  if (plan.stripe_account_id) return retrieveAccount(stripe, plan.stripe_account_id, plan);
  if (!plan.first_attempt_at) return null;
  const recovered = await findCreatedAccount(stripe, plan);
  return recovered ? bindAccount(admin, plan, recovered) : null;
}

/** Gates are also checked here so importing the helper cannot bypass the route guards. */
export async function ensureTestConnectAccount(admin: SupabaseClient, stripe: Stripe, userId: string, seller: ConnectSeller) {
  if (!paymentsEnabled || !CONNECT_MODEL_APPROVED || !CONNECT_ONBOARDING_ENABLED) {
    throw new TestConnectError('CONNECT_NOT_ENABLED', 'La configurazione degli incassi non è ancora disponibile.', 403);
  }
  await assertExpectedTestPlatform(stripe);
  let plan = await readPlan(admin, userId);
  if (!plan) {
    const proposed: Stripe.V2.Core.AccountCreateParams = {
      contact_email: z.email().parse(seller.details.email),
      display_name: z.string().trim().min(2).max(100).parse(seller.details.displayName),
      identity: { country: z.string().regex(/^[A-Z]{2}$/).parse(seller.country_code),
        entity_type: seller.seller_type === 'shop' && seller.details.businessType === 'company' ? 'company' : 'individual' },
      dashboard: 'full',
      configuration: { merchant: { capabilities: { card_payments: { requested: true } } } },
      defaults: { responsibilities: { fees_collector: 'stripe', losses_collector: 'stripe' } },
      include: includes,
      metadata: { cosmora_user_id: userId, cosmora_connect_model: CONNECT_MODEL_VERSION,
        cosmora_platform_account_id: EXPECTED_STRIPE_PLATFORM_ACCOUNT_ID, cosmora_mode: 'test' },
    };
    plan = await planRpc(admin, 'cosmora_prepare_test_connect', {
      p_user_id: userId, p_platform_account_id: EXPECTED_STRIPE_PLATFORM_ACCOUNT_ID,
      p_api_version: STRIPE_API_VERSION, p_request_body: proposed,
    }, userId);
  }
  if (plan.stripe_account_id) return retrieveAccount(stripe, plan.stripe_account_id, plan);
  if (plan.first_attempt_at) {
    const recovered = await findCreatedAccount(stripe, plan);
    if (recovered) return bindAccount(admin, plan, recovered);
  }
  plan = await planRpc(admin, 'cosmora_start_test_connect', { p_user_id: userId, p_request_id: plan.id }, userId);
  if (plan.stripe_account_id) return retrieveAccount(stripe, plan.stripe_account_id, plan);
  const age = Date.now() - Date.parse(plan.first_attempt_at ?? '');
  if (plan.state !== 'creating' || !Number.isFinite(age) || age < 0 || age >= retryWindowMs) {
    throw new TestConnectError('CONNECT_RECOVERY_REQUIRED', 'Esito della configurazione da recuperare con l’assistenza. Nessun altro conto è stato creato.');
  }
  // Never regenerate this body or key from an edited profile or a new HTTP request.
  const account = await stripe.v2.core.accounts.create(plan.request_body, {
    idempotencyKey: 'cosmora-test-connect-' + plan.id, apiVersion: plan.api_version,
  });
  return bindAccount(admin, plan, account);
}

export function validateTestConnectReturnUrl(appUrl: string) {
  const origin = new URL(appUrl);
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/') {
    throw new TestConnectError('CONNECT_RETURN_URL_INVALID', 'Indirizzo di ritorno degli incassi non configurato.', 503);
  }
}

export async function createTestConnectLink(stripe: Stripe, accountId: string, appUrl: string) {
  if (!paymentsEnabled || !CONNECT_MODEL_APPROVED || !CONNECT_ONBOARDING_ENABLED) {
    throw new TestConnectError('CONNECT_NOT_ENABLED', 'La configurazione degli incassi non è ancora disponibile.', 403);
  }
  await assertExpectedTestPlatform(stripe);
  validateTestConnectReturnUrl(appUrl);
  const link = await stripe.v2.core.accountLinks.create({
    account: accountId,
    use_case: { type: 'account_onboarding', account_onboarding: {
      configurations: ['merchant'], collection_options: { fields: 'eventually_due', future_requirements: 'include' },
      refresh_url: appUrl + '/seller/onboarding?stripe=refresh',
      return_url: appUrl + '/seller/onboarding?stripe=complete',
    } },
  });
  const url = new URL(link.url);
  if (link.livemode || link.account !== accountId || url.protocol !== 'https:' || url.username || url.password ||
      !['accounts.stripe.com', 'connect.stripe.com'].includes(url.hostname)) {
    throw new TestConnectError('CONNECT_LINK_INVALID', 'Collegamento incassi non verificato. Riprova.', 503);
  }
  // Short-lived single-use URLs are returned only to the authenticated user, never persisted/logged.
  return link.url;
}

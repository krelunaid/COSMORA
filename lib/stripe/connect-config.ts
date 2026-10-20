import type Stripe from 'stripe';
import { paymentsEnabled } from '@/lib/release-features';

// The owner selected this platform account. This is not an API key or proof that a key belongs to it.
export const EXPECTED_STRIPE_PLATFORM_ACCOUNT_ID = 'acct_1U6X5C3kNaGT9OXn';

// Prepared model: the seller supplies the goods directly, with a full Stripe dashboard.
// The 5% fee is approved; this model and activation still require the owner's approval.
export const CONNECT_MODEL_APPROVED = false;
export const CONNECT_ONBOARDING_ENABLED = false;
export const CONNECT_MODEL_VERSION = '2026-10-10-test-direct-full-v1';
export const CONNECT_ACCOUNT_TYPE = 'v2_direct_full';

export type ConnectReadinessReason =
  | 'legacy_express_direct_unsupported'
  | 'legacy_account_unsupported'
  | 'configuration_unverified'
  | 'fee_payer_unsupported'
  | 'dashboard_unsupported'
  | 'loss_liability_unsupported'
  | 'model_approval_required'
  | 'payments_disabled'
  | 'onboarding_disabled'
  | 'account_not_ready'
  | null;

/** Legacy accounts are inspected for diagnosis only; this does not enable their payments. */
export function assessTestConnectAccount(account: Stripe.Account) {
  const feePayer = account.controller?.fees?.payer ?? null;
  const dashboard = account.controller?.stripe_dashboard?.type ?? null;
  const lossLiability = account.controller?.losses?.payments ?? null;
  let configurationReason: ConnectReadinessReason = null;
  if (account.type === 'express' || feePayer === 'application_express' || feePayer === 'application_custom') {
    configurationReason = 'legacy_express_direct_unsupported';
  } else if (!feePayer || !dashboard || !lossLiability) {
    configurationReason = 'configuration_unverified';
  } else if (feePayer !== 'account') {
    configurationReason = 'fee_payer_unsupported';
  } else if (dashboard !== 'full') {
    configurationReason = 'dashboard_unsupported';
  } else if (lossLiability !== 'stripe') {
    configurationReason = 'loss_liability_unsupported';
  }
  const configurationSupported = configurationReason === null;
  const reason: ConnectReadinessReason = configurationReason ?? 'legacy_account_unsupported';
  return {
    configurationSupported,
    modelApproved: CONNECT_MODEL_APPROVED,
    onboardingEnabled: CONNECT_ONBOARDING_ENABLED,
    paymentsReady: false,
    reason,
    observed: { feePayer, dashboard, lossLiability },
  };
}

/** Kept as a fail-closed guard for older callers; legacy accounts are not enabled. */
export function assertTestConnectPaymentReady(account: Stripe.Account) {
  const readiness = assessTestConnectAccount(account);
  if (!readiness.paymentsReady) throw new Error(`COSMORA_CONNECT_${readiness.reason}`);
  return readiness;
}

/** Assess an account retrieved with the required v2 include fields.
 * The caller must first verify platform ownership and the saved seller/plan binding
 * through readTestConnectAccount; metadata presence alone is not authorization.
 */
export function assessTestV2ConnectAccount(account: Stripe.V2.Core.Account) {
  const feesCollector = account.defaults?.responsibilities?.fees_collector ?? null;
  const dashboard = account.dashboard ?? null;
  const lossLiability = account.defaults?.responsibilities?.losses_collector ?? null;
  // The v2 collector value "stripe" means Stripe collects its fees from the account.
  const feePayer = feesCollector === 'stripe' ? 'account' : feesCollector;
  const merchant = account.configuration?.merchant;
  const cardPaymentsActive = merchant?.capabilities?.card_payments?.status === 'active';
  const payoutsActive = merchant?.capabilities?.stripe_balance?.payouts?.status === 'active';
  let configurationReason: ConnectReadinessReason = null;
  if (account.livemode !== false || account.id === EXPECTED_STRIPE_PLATFORM_ACCOUNT_ID ||
      !account.applied_configurations?.includes('merchant') || merchant?.applied !== true ||
      !account.identity?.country || !/^[A-Z]{2}$/i.test(account.identity.country) ||
      !['individual', 'company'].includes(account.identity.entity_type ?? '') ||
      account.requirements == null || !feesCollector || !dashboard || !lossLiability) {
    configurationReason = 'configuration_unverified';
  } else if (account.closed === true) {
    configurationReason = 'account_not_ready';
  } else if (feesCollector !== 'stripe') {
    configurationReason = 'fee_payer_unsupported';
  } else if (dashboard !== 'full') {
    configurationReason = 'dashboard_unsupported';
  } else if (lossLiability !== 'stripe') {
    configurationReason = 'loss_liability_unsupported';
  }
  const configurationSupported = configurationReason === null;
  const reason: ConnectReadinessReason = configurationReason
    ?? (!CONNECT_MODEL_APPROVED ? 'model_approval_required'
      : !paymentsEnabled ? 'payments_disabled'
        : !cardPaymentsActive || !payoutsActive ? 'account_not_ready'
          : null);
  return {
    configurationSupported,
    modelApproved: CONNECT_MODEL_APPROVED,
    onboardingEnabled: CONNECT_ONBOARDING_ENABLED,
    paymentsReady: reason === null,
    reason,
    observed: { feePayer, dashboard, lossLiability },
  };
}

export function assertTestV2ConnectPaymentReady(account: Stripe.V2.Core.Account) {
  const readiness = assessTestV2ConnectAccount(account);
  if (!readiness.paymentsReady) throw new Error(`COSMORA_CONNECT_${readiness.reason}`);
  return readiness;
}

export function connectOnboardingReadiness() {
  return {
    modelApproved: CONNECT_MODEL_APPROVED,
    onboardingEnabled: CONNECT_ONBOARDING_ENABLED,
    paymentsReady: false,
    reason: !CONNECT_MODEL_APPROVED ? 'model_approval_required'
      : !paymentsEnabled ? 'payments_disabled'
        : !CONNECT_ONBOARDING_ENABLED ? 'onboarding_disabled' : null,
  };
}

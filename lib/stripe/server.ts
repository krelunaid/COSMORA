import Stripe from 'stripe';

// Keep the wire format aligned with the installed stripe-node 22.6 SDK types.
// Upgrade the SDK and this pin together after reviewing webhook compatibility.
export const STRIPE_API_VERSION = '2026-08-26.dahlia' as const;

let cachedStripe: Stripe | null = null;
let cachedTestKey: string | null = null;

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  // Prefer a restricted test key. No live/publishable/organization key is accepted.
  if (!secretKey || !/^(?:rk|sk)_test_[A-Za-z0-9]+$/.test(secretKey)) {
    // A missing or changed configuration must not fall back to a previously cached key.
    cachedStripe = null;
    cachedTestKey = null;
    return null;
  }
  if (!cachedStripe || cachedTestKey !== secretKey) {
    cachedStripe = new Stripe(secretKey, {
      apiVersion: STRIPE_API_VERSION,
      maxNetworkRetries: 2,
      timeout: 20_000,
      emitEventBodies: false,
    });
    cachedTestKey = secretKey;
  }
  return cachedStripe;
}

export function getAppUrl(request?: Request) {
  return (
    process.env.APP_URL ??
    (request ? new URL(request.url).origin : 'http://localhost:3000')
  ).replace(/\/$/, '');
}

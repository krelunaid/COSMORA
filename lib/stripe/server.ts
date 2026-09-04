import Stripe from 'stripe';

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  // Live payments stay disabled until the commercial configuration is approved.
  if (!secretKey || !secretKey.startsWith('sk_test_')) return null;
  return new Stripe(secretKey);
}

export function getAppUrl(request?: Request) {
  return (
    process.env.APP_URL ??
    (request ? new URL(request.url).origin : 'http://localhost:3000')
  ).replace(/\/$/, '');
}

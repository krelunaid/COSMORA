'use client';

import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

export function usesNativeStripeBrowser() {
  return Capacitor.isNativePlatform();
}

/** Hosted Stripe forms run in the system browser; never persist their temporary URLs. */
export async function openHostedStripePage(rawUrl: string, kind: 'checkout' | 'connect') {
  const url = new URL(rawUrl);
  const hosts = kind === 'checkout' ? ['checkout.stripe.com'] : ['connect.stripe.com', 'accounts.stripe.com'];
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !hosts.includes(url.hostname)) {
    throw new Error('Collegamento Stripe non verificato. Riprova.');
  }
  if (usesNativeStripeBrowser()) await Browser.open({ url: url.href });
  else window.location.assign(url.href);
}

'use client';

import NextLink from 'next/link';
import type { ComponentProps } from 'react';

type AppLinkProps = ComponentProps<typeof NextLink>;

function shouldDisablePrefetchForCapacitorIos() {
  if (typeof window === 'undefined') return false;

  // Capacitor iOS WKWebView user agents contain "Capacitor" and either iPhone/iPad/iPod.
  // Disabling prefetch reduces background fetches and avoids a known class of
  // WKWebView navigation transition failures in vinext beta.
  const ua = window.navigator.userAgent || '';
  return /Capacitor/i.test(ua) && /(iPhone|iPad|iPod)/i.test(ua);
}

export default function AppLink(props: AppLinkProps) {
  const { prefetch, ...rest } = props;
  const disablePrefetch = shouldDisablePrefetchForCapacitorIos();

  return <NextLink {...rest} prefetch={disablePrefetch ? false : prefetch} />;
}

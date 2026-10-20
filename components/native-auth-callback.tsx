'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { parseNativeAuthCallback } from '@/lib/supabase/auth-redirect';
import { completeNativeAuthCallback } from '@/lib/supabase/native-auth';

export function NativeAuthCallback() {
  const router = useRouter();
  const routerRef = useRef(router);
  useEffect(() => { routerRef.current = router; }, [router]);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const client = getSupabaseBrowserClient();
    if (!client) return;
    let active = true;
    const handleUrl = async (rawUrl: string) => {
      if (!active) return;
      const callback = parseNativeAuthCallback(rawUrl);
      if (!callback) return;
      const code = callback.searchParams.get('error_code');
      if (code === 'otp_expired' || code === 'flow_state_expired' || code === 'flow_state_not_found') {
        await Browser.close().catch(() => undefined);
        if (active) routerRef.current.replace('/auth/recovery?authError=expired');
        return;
      }
      try {
        const destination = await completeNativeAuthCallback(rawUrl, client);
        await Browser.close().catch(() => undefined);
        if (active && destination) routerRef.current.replace(destination);
      } catch {
        await Browser.close().catch(() => undefined);
        if (active) routerRef.current.replace('/auth/login?nativeAuth=failed');
      }
    };

    const linkListener = App.addListener('appUrlOpen', ({ url }) => { void handleUrl(url); });
    const stateListener = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) void client.auth.startAutoRefresh();
      else void client.auth.stopAutoRefresh();
    });
    // Subscribe before inspecting the launch URL to cover both a running app
    // and an OS cold start. Deduplication belongs to the exchange, not the effect.
    void linkListener.then(() => App.getLaunchUrl())
      .then((launch) => { if (launch?.url) return handleUrl(launch.url); })
      .catch(() => undefined);
    void stateListener.catch(() => undefined);
    return () => {
      active = false;
      void linkListener.then((handle) => handle.remove()).catch(() => undefined);
      void stateListener.then((handle) => handle.remove()).catch(() => undefined);
    };
  }, []);
  return null;
}

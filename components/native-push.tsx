'use client';
import { useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/components/i18n-provider';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { observeSession } from '@/lib/supabase/session';
import { disablePush, enablePush, getPushState, nativePushAvailable, setPushNavigator, subscribePush, updatePushSession } from '@/lib/native-push';
import { pushMessages } from '@/lib/i18n/push';
import Link from '@/components/app-link';

export function NativePushController() {
  const { locale } = useI18n();
  const router = useRouter();
  useEffect(() => setPushNavigator((path) => router.push(path)), [router]);
  useEffect(() => {
    if (!nativePushAvailable()) return;
    const client = getSupabaseBrowserClient();
    if (!client) return;
    return observeSession(client, (session) => { void updatePushSession(session, locale); }, () => { /* Session timeout does not revoke existing consent. */ });
  }, [locale]);
  return null;
}
export function PushSettings({ compact = false }: { compact?: boolean }) {
  const { locale } = useI18n();
  const state = useSyncExternalStore(subscribePush, getPushState, () => 'off' as const);
  const copy = pushMessages[locale];
  if (!nativePushAvailable()) return null;
  return <section className={compact ? 'mt-5 space-y-3 border-t border-white/10 pt-4' : 'space-y-3 rounded-xl border border-white/15 p-4'}>
    <h2 className="font-semibold">{copy.title}</h2>
    <p className="text-sm leading-relaxed text-white/75">{copy.description}</p>
    <button type="button" disabled={state === 'busy'} onClick={() => { void (state === 'enabled' ? disablePush() : enablePush()); }} className="min-h-11 rounded-xl border border-violet-300/50 px-4 py-2 text-violet-200 disabled:opacity-50">{state === 'busy' ? copy.busy : state === 'enabled' ? copy.disable : copy.enable}</button>
    {state === 'error' && <button type="button" onClick={() => { void disablePush(); }} className="ml-2 min-h-11 px-3 text-pink-300 underline">{copy.disable}</button>}
    <p role="status" className="text-sm text-white/70">{copy[state === 'enabled' ? 'enabled' : state === 'denied' ? 'denied' : state === 'error' ? 'error' : 'off']}</p>
    {!compact && <Link className="block min-h-11 text-pink-300 underline" href="/thanks">{copy.read}</Link>}
  </section>;
}

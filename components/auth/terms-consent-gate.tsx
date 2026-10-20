'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { usePathname, useRouter } from 'next/navigation';
import Link from '@/components/app-link';
import { useI18n } from '@/components/i18n-provider';
import { accountMessages } from '@/lib/i18n/account';
import { commerceText } from '@/lib/i18n/commerce';
import { authTerms } from '@/lib/i18n/auth-terms';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  TERMS_VERSION,
  createTermsConsent,
  hasCurrentTermsReceipt,
  isTermsExemptPath,
  syncPendingTermsConsent,
  termsConsentStore,
} from '@/lib/terms-consent';

/** UX gate only; backend authorization remains independent of terms metadata. */
export function TermsConsentGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { locale } = useI18n();
  const copy = authTerms[locale];
  const account = accountMessages[locale];
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ));
  const [sessionError, setSessionError] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const [, setReceiptRevision] = useState(0);
  const checkboxRef = useRef<HTMLInputElement>(null);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    let active = true;
    let authEvents = 0;
    function apply(session: Session | null) {
      if (!active) return;
      const userId = session?.user.id ?? null;
      if (userIdRef.current !== userId) { setAccepted(false); setError(''); }
      userIdRef.current = userId;
      setUser(session?.user ?? null);
      setSessionError(false);
      setReady(true);
    }
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      authEvents++;
      if (event === 'SIGNED_OUT') {
        termsConsentStore.clearPending();
        if (active) { setAccepted(false); setError(''); setBusy(false); }
      }
      apply(session);
    });
    const initialEvents = authEvents;
    void client.auth.getSession().then(({ data, error: reason }) => {
      if (!active || initialEvents !== authEvents) return;
      if (reason) { setSessionError(true); setReady(true); }
      else apply(data.session);
    }).catch(() => {
      if (active && initialEvents === authEvents) { setSessionError(true); setReady(true); }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [retry]);

  async function browseAsGuest() {
    setBusy(true);
    setError('');
    try {
      const result = await getSupabaseBrowserClient()?.auth.signOut({ scope: 'local' });
      if (result?.error) throw result.error;
      termsConsentStore.clearPending();
      setUser(null);
      setAccepted(false);
      setSessionError(false);
      router.replace('/');
    } catch { setError(copy.signOutError); }
    finally { setBusy(false); }
  }

  function acceptTerms() {
    if (!user || busy) return;
    const receipt = createTermsConsent(accepted, locale, 'session-upgrade');
    if (!receipt) {
      setError(copy.required);
      checkboxRef.current?.focus();
      return;
    }
    // Associate this explicit action with this user before any asynchronous request.
    termsConsentStore.record(receipt);
    termsConsentStore.bind(receipt, user.id);
    setReceiptRevision((revision) => revision + 1);
    const client = getSupabaseBrowserClient();
    if (client) void syncPendingTermsConsent(client, user);
  }

  if (isTermsExemptPath(pathname ?? '')) return children;
  if (ready && !sessionError && (!user || hasCurrentTermsReceipt(user))) return children;

  return (
    <main className="min-h-dvh bg-[#090a19] px-5 py-10 text-white">
      <section className="mx-auto max-w-lg space-y-5 rounded-2xl border border-white/15 bg-[#101122] p-6 text-base leading-relaxed">
        {!ready ? <output>{copy.checkingSession}</output> : sessionError ? (
          <>
            <p role="alert">{copy.sessionError}</p>
            <button type="button" onClick={() => { setReady(false); setRetry((value) => value + 1); }} className="min-h-12 rounded-xl bg-violet-600 px-5">{copy.retry}</button>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold">{copy.title}</h1>
            <p>{copy.gateDescription}</p>
            <p>{copy.summary}</p>
            <p>{copy.moderation}</p>
            <p className="text-sm text-white/60">{copy.version} {TERMS_VERSION}</p>
            <Link href="/community/rules" className="block min-h-11 text-pink-300 underline">{copy.read}</Link>
            <label className="flex items-start gap-3">
              <input ref={checkboxRef} type="checkbox" checked={accepted} disabled={busy}
                aria-invalid={error === copy.required} aria-describedby={error ? 'terms-gate-error' : undefined}
                onChange={(event) => { setAccepted(event.target.checked); setError(''); }}
                className="mt-1 size-5 shrink-0" />
              <span>{copy.accept}</span>
            </label>
            <button type="button" onClick={acceptTerms} disabled={busy} className="min-h-12 w-full rounded-xl bg-violet-600 px-5 disabled:opacity-50">{copy.acceptContinue}</button>
          </>
        )}
        {error && <p id="terms-gate-error" role="alert" className="text-rose-300">{error}</p>}
        {ready && <button type="button" onClick={() => { void browseAsGuest(); }} disabled={busy} className="min-h-11 w-full text-pink-300 underline disabled:opacity-50">{copy.browseGuest}</button>}
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-pink-300">
          <Link href="/account/delete" className="min-h-11 underline">{account.deleteAccount}</Link>
          <Link href="/auth/recovery" className="min-h-11 underline">{account.forgotPassword}</Link>
          <Link href="/privacy" className="min-h-11 underline">{commerceText(locale, 'privacy')}</Link>
          <Link href="/support" className="min-h-11 underline">{account.support}</Link>
        </nav>
      </section>
    </main>
  );
}

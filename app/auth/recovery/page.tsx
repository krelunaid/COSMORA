'use client';
import { useI18n } from '@/components/i18n-provider';
import { accountMessages } from '@/lib/i18n/account';
import { useEffect, useState } from 'react';
import Link from '@/components/app-link';
import { Button } from '@/components/ui/button';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { authRedirect } from '@/lib/supabase/auth-redirect';

export default function RecoveryPage() {
  const { locale } = useI18n();
  const t = accountMessages[locale];
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    let active = true;
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (active && event === 'PASSWORD_RECOVERY' && session) setReady(true);
    });
    // A signed-in user may also change their own password from this page.
    client.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setMessage('expiredLink');
        else if (data.session) setReady(true);
        else if (window.location.hash.includes('error'))
          setMessage('expiredLink');
      })
      .catch(() => {
        if (active) setMessage('connectionFailed');
      });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  async function submit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const client = getSupabaseBrowserClient();
      if (!client) throw new Error('unavailable');
      if (ready) {
        const password = form.get('password');
        if (typeof password !== 'string') throw new Error('passwordRequired');
        if (password.length < 8 || password !== form.get('confirm'))
          throw new Error('passwordsMatch');
        const { error } = await client.auth.updateUser({ password });
        if (error) throw new Error('passwordFailed');
        setDone(true);
        setMessage('passwordSaved');
      } else {
        const email = form.get('email');
        if (typeof email !== 'string') throw new Error('validEmail');
        const { error } = await client.auth.resetPasswordForEmail(
          email.trim(),
          {
            redirectTo: authRedirect(window.location.origin, '/auth/recovery'),
          },
        );
        if (error) throw new Error('recoveryFailed');
        setMessage('recoverySent');
      }
    } catch (reason) {
      setMessage(
        reason instanceof Error && reason.message in t
          ? reason.message
          : 'connectionFailed',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="min-h-dvh bg-[#090a19] px-5 py-12 text-base">
      <section className="mx-auto max-w-md space-y-6">
        <Link href="/auth/login" className="block py-3 text-pink-300">
          {t.backLogin}
        </Link>
        <h1 className="text-2xl font-semibold">
          {ready ? t.newPasswordTitle : t.recoverAccount}
        </h1>
        {!done && (
          <form onSubmit={submit} className="space-y-5">
            {ready ? (
              <>
                <label className="block">
                  {t.newPassword}
                  <input
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    className="mt-2 w-full rounded-xl border border-white/20 bg-white/5 p-3"
                  />
                </label>
                <label className="block">
                  {t.repeatPassword}
                  <input
                    name="confirm"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    className="mt-2 w-full rounded-xl border border-white/20 bg-white/5 p-3"
                  />
                </label>
              </>
            ) : (
              <label className="block">
                {t.accountEmail}
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="mt-2 w-full rounded-xl border border-white/20 bg-white/5 p-3"
                />
              </label>
            )}
            <Button
              type="submit"
              disabled={busy}
              className="min-h-12 w-full text-base"
            >
              {busy ? t.wait : ready ? t.savePassword : t.sendLink}
            </Button>
          </form>
        )}
        {message && (
          <output className="block rounded-xl border border-white/20 p-4 text-base text-white/85">
            {t[message as keyof typeof t]}
          </output>
        )}
        {done && (
          <Link href="/profile/me" className="block py-3 text-pink-300">
            {t.goProfile}
          </Link>
        )}
      </section>
    </main>
  );
}

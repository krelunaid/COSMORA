'use client';
import { useI18n } from '@/components/i18n-provider';
import { accountMessages } from '@/lib/i18n/account';
import { useState } from 'react';
import Link from '@/components/app-link';
import { MobileShell, ScreenHeader } from '@/components/mobile-shell';
import { accountRequest } from '@/lib/account-client';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { AccountRequestError } from '@/lib/account-http';

export default function DeleteAccountPage() {
  const { locale } = useI18n();
  const t = accountMessages[locale];
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deleted, setDeleted] = useState(false);
  const [apple, setApple] = useState(false);
  const [appleRevoked, setAppleRevoked] = useState(false);
  async function remove(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || confirmation !== t.deleteWord) return;
    setBusy(true);
    setError('');
    try {
      const session = (await getSupabaseBrowserClient()?.auth.getSession())?.data.session;
      if (!session) {
        setError('deleteSignIn');
        return;
      }
      const appleRefreshToken = session?.user.identities?.some((identity) => identity.provider === 'apple')
        ? session.provider_refresh_token : undefined;
      const result = await accountRequest<{
        deleted: boolean;
        appleManualRevocation: boolean;
        appleRevocation?: 'not-applicable' | 'manual-required' | 'revoked';
      }>('/api/account/delete', {
        method: 'DELETE',
        body: JSON.stringify({ confirmation: 'ELIMINA', appleRefreshToken }),
      }, 60000);
      setApple(result.appleManualRevocation);
      setAppleRevoked(result.appleRevocation === 'revoked');
      setDeleted(true);
      // The server has already deleted the account; local cleanup cannot undo it.
      try {
        await getSupabaseBrowserClient()?.auth.signOut({ scope: 'local' });
      } catch {
        /* Session will expire. */
      }
    } catch (reason) {
      setError(reason instanceof AccountRequestError && reason.status === 401
        ? 'deleteSignIn'
        : reason instanceof AccountRequestError && reason.code === 'APPLE_IDENTITY_MISMATCH'
        ? 'appleIdentityMismatch'
        : reason instanceof AccountRequestError && reason.code === 'APPLE_REVOCATION_UNAVAILABLE'
          ? 'appleRevocationUnavailable' : 'deleteFailed');
    } finally {
      setBusy(false);
    }
  }
  return (
    <MobileShell>
      <ScreenHeader title={t.deleteAccount} back="/profile/me" />
      <section className="space-y-5 p-5 text-base leading-relaxed">
        {deleted ? (
          <>
            <h1 className="text-2xl font-semibold">{t.accountDeleted}</h1>
            <p>{t.deletedBody}</p>
            {apple && <p>{t.appleRevocation}</p>}
            {appleRevoked && <p>{t.appleRevoked}</p>}
            <Link
              href="/"
              className="block rounded-xl bg-violet-600 p-3 text-center"
            >
              {t.home}
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold">{t.permanent}</h1>
            <p>{t.deleteBody}</p>
            <p>{t.deleteConversations}</p>
            <form onSubmit={remove} className="space-y-4">
              <label className="block">
                {t.typeDelete.replace('{word}', t.deleteWord)}
                <input
                  autoComplete="off"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  disabled={busy}
                  className="mt-2 w-full rounded-xl border border-white/25 bg-[#111225] p-3"
                />
              </label>
              <button
                disabled={busy || confirmation !== t.deleteWord}
                className="min-h-12 w-full rounded-xl bg-rose-700 px-4 disabled:opacity-50"
              >
                {busy ? t.deleting : t.deletePermanently}
              </button>
            </form>
            {error && (
              <p role="alert" className="text-amber-200">
                {t[error as keyof typeof t]}
              </p>
            )}
            {error === 'deleteSignIn' && <Link href="/auth/login" className="block min-h-12 rounded-xl bg-violet-600 p-3 text-center">{t.backLogin}</Link>}
            <Link
              href="/profile/me"
              className="block min-h-12 py-3 text-pink-300"
            >
              {t.cancelDelete}
            </Link>
          </>
        )}
      </section>
    </MobileShell>
  );
}

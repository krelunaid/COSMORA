'use client';
import { useI18n } from '@/components/i18n-provider';
import { accountMessages } from '@/lib/i18n/account';

import { useEffect, useState } from 'react';
import Link from '@/components/app-link';
import { MobileNav, MobileShell } from '@/components/mobile-shell';
import { accountRequest } from '@/lib/account-client';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { localeLabels, supportedLocales, type Locale } from '@/lib/i18n/config';
import { paymentsEnabled } from '@/lib/release-features';
import { accountRestrictions } from '@/lib/i18n/account-restrictions';
import { SafetyLink } from '@/components/safety-link';

export default function MyProfilePage() {
  const { locale, setLocale, messages } = useI18n();
  const t = accountMessages[locale];
  const [profile, setProfile] = useState({
    displayName: '',
    country: '',
    email: '',
    suspended: false,
    deletionPending: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [ready, setReady] = useState(false);
  const restricted = profile.suspended || profile.deletionPending;
  useEffect(() => {
    let active = true;
    accountRequest<{ displayName: string; country: string; email: string; suspended?: boolean; deletionPending?: boolean }>('/api/account')
      .then((value) => {
        if (active) {
          setProfile({ ...value, suspended: value.suspended === true, deletionPending: value.deletionPending === true });
          setReady(true);
        }
      })
      .catch(() => {
        if (active) setError('accountFailed');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  async function save(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (restricted) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await accountRequest('/api/account', {
        method: 'PUT',
        body: JSON.stringify(profile),
      });
      setNotice('saved');
    } catch {
      setError('saveFailed');
    } finally {
      setSaving(false);
    }
  }
  async function signOut() {
    try {
      const result = await getSupabaseBrowserClient()?.auth.signOut();
      if (result?.error) throw result.error;
      window.location.assign('/auth/login');
    } catch {
      setError('signOutFailed');
    }
  }
  return (
    <MobileShell>
      <section className="space-y-5 px-5 py-6 pb-28">
        <h1 className="text-2xl font-semibold">{t.myProfile}</h1>
        <SafetyLink />
        <section className="space-y-2 rounded-xl border border-white/15 p-4">
          <label className="flex flex-wrap items-center justify-between gap-3 text-base">
            {t.language}
            <select
              value={locale}
              onChange={(event) => setLocale(event.target.value as Locale)}
              className="min-h-11 rounded-lg border border-white/20 bg-[#111225] px-3"
            >
              {supportedLocales.map((item) => (
                <option key={item} value={item}>
                  {localeLabels[item]}
                </option>
              ))}
            </select>
          </label>
          <p className="text-sm text-white/65">{t.languageHint}</p>
        </section>
        <Link
          href="/support"
          className="block rounded-xl border border-white/15 p-4 text-base text-pink-300"
        >
          {t.support}
        </Link>
        {loading && <p>{t.accountLoading}</p>}
        {error && (
          <output className="block rounded-xl border border-amber-300/30 p-4 text-base text-amber-100">
            {t[error as keyof typeof t]}
          </output>
        )}
        {!loading && !ready && (
          <Link
            href="/auth/login"
            className="block rounded-xl bg-violet-600 p-4 text-center"
          >
            {t.loginOrCreate}
          </Link>
        )}
        {ready && (
          <>
            <p className="break-all text-base text-white/75">{profile.email}</p>
            <p className="text-sm text-white/70">{t.privateEmail}</p>
            {restricted && <p role="status" className="rounded-xl border border-amber-300/30 p-4 text-amber-100">
              {profile.deletionPending ? accountRestrictions[locale].deleting : accountRestrictions[locale].suspended}
            </p>}
            {!restricted && <>
            <form onSubmit={save} className="space-y-4">
              <label className="block text-base">
                {messages.auth.name}
                <input
                  value={profile.displayName}
                  onChange={(event) =>
                    setProfile({ ...profile, displayName: event.target.value })
                  }
                  required
                  placeholder={t.namePlaceholder}
                  minLength={2}
                  maxLength={80}
                  className="mt-2 w-full rounded-xl border border-white/20 bg-[#111225] p-3"
                />
              </label>
              <label className="block text-base">
                {t.country}
                <input
                  value={profile.country}
                  placeholder={t.countryPlaceholder}
                  onChange={(event) =>
                    setProfile({ ...profile, country: event.target.value })
                  }
                  maxLength={80}
                  className="mt-2 w-full rounded-xl border border-white/20 bg-[#111225] p-3"
                />
              </label>
              <button
                disabled={saving}
                className="w-full rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 p-3 text-base disabled:opacity-50"
              >
                {saving ? t.saving : t.saveProfile}
              </button>
              {notice && (
                <output className="block text-base text-emerald-300">
                  {t[notice as keyof typeof t]}
                </output>
              )}
            </form>
            <nav className="space-y-3 text-base">
              <Link
                className="block rounded-xl border border-white/15 p-4"
                href="/favorites"
              >
                {t.favorites}
              </Link>
              {paymentsEnabled && (
                <Link
                  className="block rounded-xl border border-white/15 p-4"
                  href="/cart"
                >
                  {t.cart}
                </Link>
              )}
              <Link
                className="block rounded-xl border border-white/15 p-4"
                href="/seller"
              >
                {t.myListings}
              </Link>
              <Link
                className="block rounded-xl border border-white/15 p-4"
                href="/sell"
              >
                {t.newListing}
              </Link>
              <Link
                className="block rounded-xl border border-white/15 p-4"
                href="/seller/onboarding"
              >
                {t.sellerSettings}
              </Link>
              <Link
                className="block rounded-xl border border-white/15 p-4"
                href="/inbox"
              >
                {paymentsEnabled ? t.messagesOrders : messages.nav.inbox}
              </Link>
            </nav>
            </>}
            <button
              onClick={signOut}
              className="min-h-12 w-full rounded-xl border border-white/20 text-base"
            >
              {t.signOut}
            </button>
            <Link
              href="/account/delete"
              className="block min-h-12 rounded-xl border border-rose-400/40 p-3 text-center text-base text-rose-300"
            >
              {t.deleteMyAccount}
            </Link>
          </>
        )}
      </section>
      <MobileNav active="profile" />
    </MobileShell>
  );
}

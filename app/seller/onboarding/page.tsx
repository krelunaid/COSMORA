'use client';
import { useI18n } from '@/components/i18n-provider';
import { saleText, type SaleKey } from '@/lib/i18n/sale';
import { apiErrorText } from '@/lib/i18n/api-errors';
import { paymentsEnabled } from '@/lib/release-features';
import { useState, useEffect, useRef } from 'react';
import { Browser } from '@capacitor/browser';
import { openHostedStripePage, usesNativeStripeBrowser } from '@/lib/stripe-browser';
import { MobileShell, ScreenHeader } from '@/components/mobile-shell';
import { accountRequest } from '@/lib/account-client';
import { AccountRequestError } from '@/lib/account-http';
import Link from '@/components/app-link';
export default function Onboarding() {
  const { locale } = useI18n();
  const t = (key: SaleKey) => saleText(locale, key);

  const [type, setType] = useState('private');
  const [values, setValues] = useState<Record<string, string>>({
    country: 'IT',
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<Error | string>('');
  const [needsLogin, setNeedsLogin] = useState(false);
  const [connectReady, setConnectReady] = useState<boolean | null>(null);
  const connecting = useRef(false);
  const refreshedLink = useRef(false);
  useEffect(() => {
    let active = true;
    accountRequest<{
      profile: { seller_type: string; details: Record<string, string> } | null;
    }>('/api/seller/profile')
      .then((d) => {
        if (active && d.profile) {
          setType(d.profile.seller_type);
          setValues(d.profile.details);
          setSaved(true);
        }
      })
      .catch((error) => {
        if (active) {
          setError(error instanceof Error ? error : 'failed');
          setNeedsLogin(error instanceof AccountRequestError && error.status === 401);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!paymentsEnabled || !saved) return;
    let active = true;
    const refresh = async () => {
      try {
        const current = await accountRequest<{ paymentsReady: boolean }>('/api/stripe/connect');
        if (active) setConnectReady(current.paymentsReady === true);
      } catch (reason) {
        if (active) {
          setConnectReady(null);
          setError(reason instanceof Error ? reason : 'failed');
        }
      }
    };
    // Returning from hosted onboarding is not proof of account/payment readiness.
    void refresh();
    if (new URL(window.location.href).searchParams.get('stripe') === 'refresh' && !refreshedLink.current) {
      refreshedLink.current = true;
      // Regenerate only a short-lived link, using the same durable account plan.
      const clean = new URL(window.location.href);
      clean.searchParams.delete('stripe');
      window.history.replaceState(window.history.state, '', clean.pathname + clean.search + clean.hash);
      void connect();
    }
    const listener = usesNativeStripeBrowser() ? Browser.addListener('browserFinished', () => { void refresh(); }) : null;
    const onFocus = () => { void refresh(); };
    window.addEventListener('focus', onFocus);
    return () => {
      active = false;
      window.removeEventListener('focus', onFocus);
      void listener?.then((handle) => handle.remove()).catch(() => undefined);
    };
  }, [saved]);
  async function save(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setNeedsLogin(false);
    setSaved(false);
    setBusy(true);
    try {
      await accountRequest('/api/seller/profile', {
        method: 'POST',
        body: JSON.stringify({
          ...values,
          sellerType: type,
          businessType: type === 'private' ? 'individual' : values.businessType,
        }),
      });
      setSaved(true);
    } catch (error) {
      setError(error instanceof Error ? error : 'failed');
      setNeedsLogin(error instanceof AccountRequestError && error.status === 401);
    } finally {
      setBusy(false);
    }
  }
  async function connect() {
    if (!paymentsEnabled || connecting.current) return;
    connecting.current = true;
    setBusy(true);
    setError('');
    setNeedsLogin(false);
    try {
      const r = await accountRequest<{ url: string }>('/api/stripe/connect', {
        method: 'POST',
      });
      await openHostedStripePage(r.url, 'connect');
    } catch (error) {
      setError(error instanceof Error ? error : 'failed');
      setNeedsLogin(error instanceof AccountRequestError && error.status === 401);
    } finally {
      connecting.current = false;
      setBusy(false);
    }
  }
  const fields = [
    ['displayName', t('publicName')],
    ['email', t('email')],
    ['phone', t('phone')],
    ['description', t('bio')],
    ...(type === 'shop'
      ? [
          ['legalName', t('legalName')],
          ['vatNumber', t('vat')],
          ['registrationNumber', t('registration')],
          ['registeredAddress', t('address')],
          ['legalRepresentative', t('representative')],
          ['billingAddress', t('billing')],
          ['shippingPolicy', t('shippingPolicy')],
          ['returnsPolicy', t('returns')],
        ]
      : []),
  ];
  return (
    <MobileShell>
      <ScreenHeader title={t('profile')} back="/seller" />
      <div className="p-5 pb-12">
        {loading ? (
          <output>{t('loadingProfile')}</output>
        ) : (
          <form
            onInvalid={(event) => {
              event.preventDefault();
              setError('invalid');
              setNeedsLogin(false);
            }}
            onSubmit={save}
            className="space-y-5"
          >
            <h1 className="text-2xl font-semibold">{t('sellCosmora')}</h1>
            <p className="text-white/70">{t('profileHint')}</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['private', t('private')],
                ['shop', t('shop')],
              ].map(([v, l]) => (
                <button
                  type="button"
                  key={v}
                  aria-pressed={type === v}
                  onClick={() => {
                    setType(v);
                    setSaved(false);
                  }}
                  className={
                    'min-h-14 rounded-xl border ' +
                    (type === v
                      ? 'border-pink-400 bg-pink-500/15'
                      : 'border-white/20')
                  }
                >
                  {l}
                </button>
              ))}
            </div>
            {type === 'shop' && (
              <label className="block">
                {t('business')}
                <select
                  required
                  value={values.businessType || ''}
                  onChange={(e) => {
                    setValues((v) => ({ ...v, businessType: e.target.value }));
                    setSaved(false);
                  }}
                  className="checkout-input mt-2"
                >
                  <option value="">{t('choose')}</option>
                  <option value="individual">{t('individual')}</option>
                  <option value="company">{t('company')}</option>
                </select>
              </label>
            )}
            {fields.map(([name, label]) => (
              <label key={name} className="block">
                {label}
                <input
                  type={
                    name === 'email'
                      ? 'email'
                      : name === 'phone'
                        ? 'tel'
                        : 'text'
                  }
                  required={
                    ![
                      'description',
                      'registrationNumber',
                      'billingAddress',
                    ].includes(name)
                  }
                  maxLength={2000}
                  value={values[name] || ''}
                  onChange={(e) => {
                    setValues((v) => ({ ...v, [name]: e.target.value }));
                    setSaved(false);
                  }}
                  className="checkout-input mt-2"
                />
              </label>
            ))}
            <label className="block">
              {t('country')}
              <select
                value={values.country || 'IT'}
                onChange={(e) => {
                  setValues((v) => ({ ...v, country: e.target.value }));
                  setSaved(false);
                }}
                className="checkout-input mt-2"
              >
                {Object.entries({
                  IT: 'Italia',
                  FR: 'Francia',
                  DE: 'Germania',
                  ES: 'Spagna',
                  BE: 'Belgio',
                  NL: 'Paesi Bassi',
                  AT: 'Austria',
                  PT: 'Portogallo',
                  IE: 'Irlanda',
                  GB: 'Regno Unito',
                  PL: 'Polonia',
                  SE: 'Svezia',
                  DK: 'Danimarca',
                  FI: 'Finlandia',
                  GR: 'Grecia',
                  CZ: 'Cechia',
                  RO: 'Romania',
                  HU: 'Ungheria',
                  CH: 'Svizzera',
                }).map(([code]) => (
                  <option key={code} value={code}>
                    {new Intl.DisplayNames([locale], { type: 'region' }).of(
                      code,
                    )}
                  </option>
                ))}
              </select>
            </label>
            <p className="rounded-xl bg-amber-500/10 p-4 text-sm text-amber-100">
              {t('sensitive')}
            </p>
            <label className="flex gap-3">
              <input type="checkbox" required className="size-5 shrink-0" />
              {t('confirmProfile')}
            </label>
            <button
              disabled={busy}
              className="min-h-12 w-full rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 font-semibold disabled:opacity-50"
            >
              {busy ? t('wait') : t('saveProfile')}
            </button>
            {saved && (
              <div
                aria-live="polite"
                className="space-y-3 rounded-xl border border-emerald-400/25 p-4"
              >
                <p className="text-emerald-300">{t('savedProfile')}</p>
                <Link
                  href="/sell"
                  className="block min-h-11 py-2 text-pink-300 underline"
                >
                  {t('title')}
                </Link>
                <section className="space-y-2 rounded-xl border border-white/15 p-4">
                  <h2 className="font-semibold">{t('salesFeeTitle')}</h2>
                  <p className="text-sm text-white/75">{t('salesFeePolicy')}</p>
                  {!paymentsEnabled && <p className="text-sm text-amber-200">{t('salesPaymentsUnavailable')}</p>}
                </section>
                {paymentsEnabled && (
                  <section className="space-y-3 rounded-xl border border-violet-400/25 bg-violet-500/10 p-4">
                    <h2 className="text-lg font-semibold">
                      {t('payoutSetup')}
                    </h2>
                    <p className="text-base text-white/80">
                      {t('payoutExplanation')}
                    </p>
                    <p className="text-sm text-amber-200">{t('payoutTest')}</p>
                    {connectReady !== null && <p role="status">{t(connectReady ? 'payoutReady' : 'payoutIncomplete')}</p>}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={connect}
                      className="min-h-11 text-violet-300 underline"
                    >
                      {busy ? t('wait') : t('payoutSetup')}
                    </button>
                  </section>
                )}
              </div>
            )}
          </form>
        )}
        {error && (
          <p role="alert" className="mt-4 text-rose-300">
            {error === 'invalid' ? t('invalid') : apiErrorText(locale, error, t('error'))}
            {needsLogin && (
              <Link href="/auth/login" className="ml-2 underline">
                {t('login')}
              </Link>
            )}
          </p>
        )}
      </div>
    </MobileShell>
  );
}

'use client';
import { useI18n } from '@/components/i18n-provider';
import { saleText, type SaleKey } from '@/lib/i18n/sale';
import { paymentsEnabled } from '@/lib/release-features';
import { useState, useEffect } from 'react';
import { MobileShell, ScreenHeader } from '@/components/mobile-shell';
import { accountRequest } from '@/lib/account-client';
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
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    accountRequest<{
      profile: { seller_type: string; details: Record<string, string> } | null;
    }>('/api/seller/profile')
      .then((d) => {
        if (active && d.profile) {
          setType(d.profile.seller_type);
          setValues(d.profile.details);
        }
      })
      .catch(() => {
        if (active) setError('failed');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  async function save(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
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
    } catch {
      setError('failed');
    } finally {
      setBusy(false);
    }
  }
  async function connect() {
    setBusy(true);
    setError('');
    try {
      const r = await accountRequest<{ url: string }>('/api/stripe/connect', {
        method: 'POST',
      });
      window.location.assign(r.url);
    } catch {
      setError('failed');
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
                {paymentsEnabled && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={connect}
                    className="min-h-11 text-violet-300 underline"
                  >
                    {t('stripe')}
                  </button>
                )}
              </div>
            )}
          </form>
        )}
        {error && (
          <p role="alert" className="mt-4 text-rose-300">
            {t(error === 'invalid' ? 'invalid' : 'error')}{' '}
            <Link href="/auth/login" className="underline">
              {t('login')}
            </Link>
          </p>
        )}
      </div>
    </MobileShell>
  );
}

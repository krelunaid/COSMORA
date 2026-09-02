'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, CheckCircle2, UserRound } from 'lucide-react';

import { MobileShell, ScreenHeader } from '@/components/mobile-shell';
import { PLATFORM_FEE_RULES } from '@/lib/monetization';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type SellerType = 'private' | 'shop';

const sellerTypes = [
  {
    id: 'private' as const,
    label: 'Private seller',
    description: 'Sell items from your personal collection.',
    icon: UserRound,
  },
  {
    id: 'shop' as const,
    label: 'Professional shop',
    description: 'Operate with registered business details.',
    icon: Building2,
  },
];

export default function SellerOnboardingPage() {
  const router = useRouter();
  const [sellerType, setSellerType] = useState<SellerType>('private');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(formData: FormData) {
    setSaving(true);
    setError('');
    const profile = Object.fromEntries(formData.entries());
    const supabase = getSupabaseBrowserClient();
    const session = await supabase?.auth.getSession();
    const token = session?.data.session?.access_token;
    if (!token) {
      router.push('/auth/login');
      return;
    }
    const response = await fetch('/api/seller/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        displayName: profile.displayName,
        country: profile.country,
        sellerType,
      }),
    });
    const result = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    if (!response.ok) {
      setSaving(false);
      setError(result?.error ?? 'Salvataggio non riuscito.');
      return;
    }
    localStorage.setItem(
      'cosmora_seller_profile',
      JSON.stringify({
        ...profile,
        sellerType,
        verified: false,
        createdAt: new Date().toISOString(),
      }),
    );
    const stripeResponse = await fetch('/api/stripe/connect', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const stripeResult = (await stripeResponse.json().catch(() => null)) as {
      url?: string;
      error?: string;
    } | null;
    if (stripeResponse.ok && stripeResult?.url) {
      setSaved(true);
      window.location.assign(stripeResult.url);
      return;
    }
    setSaving(false);
    setError(
      stripeResult?.error ??
        'Profilo salvato. Il conto pagamenti sarà collegato appena Stripe è configurato.',
    );
  }

  if (saved)
    return (
      <MobileShell>
        <div className="flex min-h-[760px] flex-col items-center justify-center px-8 text-center">
          <CheckCircle2 className="size-16 text-emerald-300" />
          <h1 className="mt-5 text-2xl font-semibold">Seller profile saved</h1>
          <p className="mt-3 text-sm text-white/50">
            You can now publish your first listing.
          </p>
        </div>
      </MobileShell>
    );

  return (
    <MobileShell>
      <ScreenHeader title="Become a Seller" back="/" />
      <form action={submit} className="space-y-4 px-4 pb-8 pt-4">
        <section>
          <p className="text-[10px] font-medium uppercase tracking-[.18em] text-pink-300">
            Choose your seller type
          </p>
          <div className="mt-3 space-y-2">
            {sellerTypes.map(({ id, label, description, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setSellerType(id)}
                className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left ${sellerType === id ? 'border-pink-400 bg-pink-400/10' : 'border-white/10 bg-[#111225]'}`}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-500/10">
                  <Icon className="size-5 text-violet-300" />
                </span>
                <span>
                  <strong className="block text-xs">{label}</strong>
                  <span className="mt-1 block text-[9px] text-white/45">
                    {description}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-white/8 bg-[#0d0e1d] p-4">
          <h2 className="text-sm font-semibold">
            {sellerType === 'shop' ? 'Business details' : 'Seller details'}
          </h2>
          <input
            required
            name="displayName"
            placeholder={
              sellerType === 'shop' ? 'Public shop name' : 'Display name'
            }
            className="checkout-input"
          />
          {sellerType === 'shop' && (
            <>
              <input
                required
                name="legalName"
                placeholder="Legal business name"
                className="checkout-input"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  required
                  name="vatNumber"
                  placeholder="VAT / Partita IVA"
                  className="checkout-input"
                />
                <input
                  name="registrationNumber"
                  placeholder="Company number"
                  className="checkout-input"
                />
              </div>
              <input
                required
                name="registeredAddress"
                placeholder="Registered business address"
                className="checkout-input"
              />
              <input
                required
                name="legalRepresentative"
                placeholder="Legal representative"
                className="checkout-input"
              />
            </>
          )}
          <div className="grid grid-cols-2 gap-2">
            <select required name="country" className="checkout-input">
              <option value="">Country</option>
              <option>Italy</option>
              <option>France</option>
              <option>Germany</option>
              <option>Spain</option>
              <option>Belgium</option>
              <option>Netherlands</option>
              <option>Other EU</option>
            </select>
            <input
              required
              name="phone"
              type="tel"
              placeholder="Contact phone"
              className="checkout-input"
            />
          </div>
          <input
            required
            name="email"
            type="email"
            placeholder={
              sellerType === 'shop' ? 'Business email' : 'Contact email'
            }
            className="checkout-input"
          />
          <textarea
            name="description"
            placeholder="Seller or shop description"
            className="checkout-input min-h-24 resize-none py-3"
          />
        </section>

        {sellerType === 'shop' && (
          <>
            <section className="space-y-3 rounded-2xl border border-white/8 bg-[#0d0e1d] p-4">
              <h2 className="text-sm font-semibold">Sales settings</h2>
              <input
                required
                name="billingAddress"
                placeholder="Billing address"
                className="checkout-input"
              />
              <div className="h-11 w-full rounded-xl border border-white/10 text-[10px] text-white/35">
                <span className="grid h-full place-items-center">
                  Il conto sarà collegato in modo sicuro da Stripe
                </span>
              </div>
              <textarea
                required
                name="shippingPolicy"
                placeholder="Shipping policy"
                className="checkout-input min-h-20 resize-none py-3"
              />
              <textarea
                required
                name="returnsPolicy"
                placeholder="Returns and warranty policy"
                className="checkout-input min-h-20 resize-none py-3"
              />
            </section>
            <p className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-[9px] leading-4 text-amber-100/70">
              Prototype only: use test data. Identity documents and bank details
              are not collected or stored until secure verification and Stripe
              Connect are activated.
            </p>
          </>
        )}

        <section className="space-y-3 rounded-2xl border border-violet-400/20 bg-violet-400/5 p-4">
          <div>
            <h2 className="text-sm font-semibold">Pagamenti e commissioni</h2>
            <p className="mt-1 text-[9px] leading-4 text-white/45">
              Il compratore non paga costi di servizio. Stripe versa il compenso
              al tuo conto dopo aver trattenuto la commissione COSMORA.
            </p>
          </div>
          <div className="space-y-2 rounded-xl bg-[#0d0e1d] p-3 text-[9px]">
            <div className="flex justify-between">
              <span>Vendita</span>
              <strong>{PLATFORM_FEE_RULES.sale.rateBps / 100}%</strong>
            </div>
            <div className="flex justify-between">
              <span>Noleggio</span>
              <strong>{PLATFORM_FEE_RULES.rental.rateBps / 100}%</strong>
            </div>
            <div className="flex justify-between">
              <span>Commissione personalizzata</span>
              <strong>{PLATFORM_FEE_RULES.commission.rateBps / 100}%</strong>
            </div>
            <p className="pt-1 text-[8px] text-white/35">
              Cauzioni, rimborsi e spese di spedizione sono esclusi dal ricavo
              COSMORA.
            </p>
          </div>
          <p className="rounded-xl border border-pink-400/30 bg-pink-400/8 p-3 text-center text-[10px] text-pink-200">
            Dopo il salvataggio verrai trasferito su Stripe per collegare il
            conto senza condividere dati bancari con COSMORA.
          </p>
          <p className="text-[8px] leading-3 text-white/35">
            Il collegamento sarà attivo appena vengono configurate le chiavi
            protette del vostro account Stripe e l’accesso utenti reale.
          </p>
        </section>

        <label className="flex items-start gap-2 rounded-xl border border-white/8 p-3 text-[9px] leading-4 text-white/55">
          <input required type="checkbox" className="mt-0.5" />I confirm that
          the information supplied is accurate and that I am authorised to sell
          with this account.
        </label>
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-[9px] text-amber-100"
          >
            {error}
          </p>
        )}
        <button
          disabled={saving}
          className="h-12 w-full rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 text-sm font-medium disabled:opacity-60"
        >
          {saving ? 'Salvataggio…' : 'Salva e collega i pagamenti'}
        </button>
      </form>
    </MobileShell>
  );
}

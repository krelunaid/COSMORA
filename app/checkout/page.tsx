'use client';

import { useState } from 'react';
import Link from '@/components/app-link';
import { useSearchParams } from 'next/navigation';
import {
  CalendarCheck2,
  Camera,
  CheckCircle2,
  CreditCard,
  LockKeyhole,
  MapPin,
  RotateCcw,
} from 'lucide-react';

import { MobileShell, ScreenHeader } from '@/components/mobile-shell';
import { calculateMarketplaceQuote, cents } from '@/lib/monetization';

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const isRental = searchParams.get('rental') === 'local';
  const rentalQuote = calculateMarketplaceQuote({
    kind: 'rental',
    amountCents: 14900,
    depositCents: 10000,
  });
  const [complete, setComplete] = useState(false);
  if (complete)
    return (
      <MobileShell>
        <div className="flex min-h-dvh flex-col items-center justify-center px-8 text-center">
          <CheckCircle2 className="size-16 text-emerald-300" />
          <h1 className="mt-5 text-2xl font-semibold">
            {isRental ? 'Prenotazione demo creata' : 'Ordine demo creato'}
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/55">
            Nessun pagamento è stato effettuato. La pratica #CM-DEMO-1048 mostra
            il futuro flusso protetto.
          </p>
          <Link
            href="/"
            className="mt-7 grid h-11 w-full place-items-center rounded-xl bg-gradient-to-r from-pink-500 to-violet-500"
          >
            Torna alla Home
          </Link>
        </div>
      </MobileShell>
    );
  return (
    <MobileShell>
      <ScreenHeader
        title={isRental ? 'Prenota il noleggio' : 'Checkout Demo'}
        back={isRental ? '/marketplace/raiden-shogun-cosplay' : '/cart'}
      />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setComplete(true);
        }}
        className="space-y-5 px-4 py-5"
      >
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/8 p-3 text-[10px] leading-4 text-amber-100">
          Versione dimostrativa: Stripe Connect non è attivo e COSMORA non
          raccoglie né conserva dati reali della carta.
        </div>
        {isRental && (
          <section>
            <h2 className="text-sm font-semibold">Come funziona</h2>
            <div className="mt-3 grid grid-cols-4 gap-1">
              <RentalStep icon={CalendarCheck2} number="1" label="Prenota" />
              <RentalStep icon={MapPin} number="2" label="Incontra" />
              <RentalStep icon={Camera} number="3" label="Ritira" />
              <RentalStep icon={RotateCcw} number="4" label="Restituisci" />
            </div>
            <p className="mt-3 text-[9px] leading-4 text-white/50">
              Scegli un luogo pubblico. Al ritiro entrambi fotografate il
              costume e confermate la consegna nell’app. Alla scadenza tornate
              nello stesso luogo, registrate le condizioni e confermate la
              restituzione.
            </p>
          </section>
        )}
        {isRental ? (
          <Section title="1. Scegli l’appuntamento pubblico">
            <input
              required
              placeholder="Nome e cognome"
              className="checkout-input"
            />
            <select required className="checkout-input">
              <option value="">Scegli luogo pubblico o evento</option>
              <option>
                Lucca Comics & Games 2026 · official meeting point
              </option>
              <option>Luogo pubblico verificato concordato in chat</option>
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input required type="date" className="checkout-input" />
              <input required type="time" className="checkout-input" />
            </div>
            <label className="flex items-start gap-2 rounded-xl border border-white/8 p-3 text-[9px] leading-4 text-white/55">
              <input required type="checkbox" className="mt-0.5" />
              Ho compreso che il contratto di noleggio è direttamente tra
              proprietario e cliente e accetto la procedura fotografica di
              ritiro e restituzione.
            </label>
          </Section>
        ) : (
          <Section title="Delivery">
            <input
              required
              placeholder="Full name"
              className="checkout-input"
            />
            <input required placeholder="Address" className="checkout-input" />
            <div className="grid grid-cols-2 gap-2">
              <input required placeholder="City" className="checkout-input" />
              <input
                required
                placeholder="Postcode"
                className="checkout-input"
              />
            </div>
            <select className="checkout-input">
              <option>Italy</option>
              <option>France</option>
              <option>Germany</option>
              <option>Spain</option>
            </select>
          </Section>
        )}
        <Section title={isRental ? '2. Metodo di pagamento demo' : 'Payment'}>
          <div className="flex gap-2">
            {['Card', 'PayPal', 'Apple Pay'].map((method, index) => (
              <button
                type="button"
                key={method}
                className={`flex-1 rounded-xl border p-3 text-[10px] ${index === 0 ? 'border-pink-400 bg-pink-400/10' : 'border-white/10'}`}
              >
                {method}
              </button>
            ))}
          </div>
          <label className="relative block">
            <CreditCard className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
            <input
              required
              placeholder="Card number"
              className="checkout-input pl-10!"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input required placeholder="MM / YY" className="checkout-input" />
            <input required placeholder="CVC" className="checkout-input" />
          </div>
        </Section>
        <div className="rounded-2xl border border-white/10 bg-[#111225] p-4 text-xs">
          {isRental ? (
            <>
              <div className="flex justify-between text-white/55">
                <span>Noleggio · 3 giorni</span>
                <span>{cents(rentalQuote.amountCents)}</span>
              </div>
              <div className="mt-2 flex justify-between text-white/55">
                <span>Deposito rimborsabile</span>
                <span>{cents(rentalQuote.depositCents)}</span>
              </div>
              <div className="mt-2 rounded-lg bg-white/[.035] p-2 text-[8px] leading-3 text-white/45">
                <div className="flex justify-between">
                  <span>Commissione COSMORA · 12%</span>
                  <span>{cents(rentalQuote.platformFeeCents)}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span>Al proprietario</span>
                  <span>{cents(rentalQuote.sellerNetCents)}</span>
                </div>
                <p className="mt-1 text-white/30">
                  La commissione è detratta dal proprietario. La cauzione è
                  esclusa e non è un guadagno COSMORA.
                </p>
              </div>
              <p className="mt-2 text-[8px] leading-3 text-white/35">
                Il deposito sarà gestito dal provider autorizzato e restituito
                dopo la conferma del rientro. In questa demo non viene
                addebitato.
              </p>
            </>
          ) : (
            <div className="flex justify-between text-white/55">
              <span>Items + protection</span>
              <span>€345,79</span>
            </div>
          )}
          <div className="mt-3 flex justify-between text-base">
            <b>{isRental ? 'Totale autorizzato' : 'Total'}</b>
            <b className="text-pink-400">
              {isRental ? cents(rentalQuote.buyerTotalCents) : '€345,79'}
            </b>
          </div>
        </div>
        <button className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 text-sm font-medium">
          <LockKeyhole className="size-4" />
          {isRental ? 'Crea prenotazione demo' : 'Create demo order · €345,79'}
        </button>
      </form>
    </MobileShell>
  );
}

function RentalStep({
  icon: Icon,
  number,
  label,
}: {
  icon: typeof CalendarCheck2;
  number: string;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#111225] p-2 text-center">
      <Icon className="mx-auto size-4 text-violet-300" />
      <b className="mt-1 block text-[8px]">
        {number}. {label}
      </b>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

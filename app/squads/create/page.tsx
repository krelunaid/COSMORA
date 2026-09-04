'use client';
import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { MobileShell, ScreenHeader } from '@/components/mobile-shell';
import { accountRequest } from '@/lib/account-client';
import Link from '@/components/app-link';
export default function CreateSquad() {
  const router = useRouter();
  const [kind, setKind] = useState('COSPLAY_SQUAD');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const f = new FormData(event.currentTarget);
    try {
      const result = await accountRequest<{ squad: { id: string } }>(
        '/api/squads',
        {
          method: 'POST',
          body: JSON.stringify({
            name: f.get('name'),
            description: f.get('description'),
            type: kind,
            city: f.get('city'),
            startsAt: new Date(f.get('date') as string).toISOString(),
            location: f.get('location'),
            maxMembers: Number(f.get('max')),
            approval: f.get('approval') === 'on',
            rules: f.get('rules'),
            fandom: f.get('fandom'),
          }),
        },
      );
      router.push('/squads/' + result.squad.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Creazione non riuscita.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <MobileShell>
      <ScreenHeader title="Crea crew o incontro" back="/squads" />
      <form onSubmit={submit} className="space-y-5 p-5 pb-12">
        <p className="text-base text-white/70">
          Una crew è una squadra cosplay. Un incontro è un appuntamento aperto
          in un luogo pubblico.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            ['COSPLAY_SQUAD', 'Crew cosplay', '/community/squad-example.jpg'],
            [
              'EVENT_MEETUP',
              'Incontro pubblico',
              '/community/meetup-example.jpg',
            ],
          ].map(([value, label, image]) => (
            <button
              key={value}
              type="button"
              aria-pressed={kind === value}
              onClick={() => setKind(value)}
              className={
                'overflow-hidden rounded-2xl border text-left ' +
                (kind === value
                  ? 'border-pink-400 bg-pink-500/10'
                  : 'border-white/15')
              }
            >
              <Image
                src={image}
                width={300}
                height={160}
                alt=""
                className="h-28 w-full object-cover"
              />
              <span className="block p-3 font-semibold">{label}</span>
            </button>
          ))}
        </div>
        {['name', 'description', 'fandom', 'city', 'location', 'rules'].map(
          (name, i) => (
            <label key={name} className="block">
              {
                [
                  'Nome',
                  'Descrizione',
                  'Fandom (facoltativo)',
                  'Città',
                  'Luogo pubblico (non un indirizzo privato)',
                  'Regole',
                ][i]
              }
              {name === 'description' || name === 'rules' ? (
                <textarea
                  name={name}
                  required
                  minLength={name === 'description' ? 12 : 5}
                  maxLength={2000}
                  className="checkout-input mt-2 min-h-24 w-full"
                />
              ) : (
                <input
                  name={name}
                  required={name !== 'fandom'}
                  minLength={name === 'name' ? 4 : name === 'location' ? 3 : 2}
                  maxLength={100}
                  className="checkout-input mt-2 w-full"
                />
              )}
            </label>
          ),
        )}
        <label className="block">
          Data e ora
          <input
            name="date"
            type="datetime-local"
            required
            className="checkout-input mt-2 w-full"
          />
        </label>
        <label className="block">
          Partecipanti massimi
          <input
            name="max"
            type="number"
            min={2}
            max={500}
            defaultValue={10}
            required
            className="checkout-input mt-2 w-full"
          />
        </label>
        <label className="flex min-h-11 items-center gap-3">
          <input
            name="approval"
            type="checkbox"
            defaultChecked
            className="size-5"
          />
          Approvo personalmente le richieste
        </label>
        {error && (
          <div role="alert" className="text-rose-300">
            {error}{' '}
            <Link href="/auth/login" className="underline">
              Accedi
            </Link>
          </div>
        )}
        <button
          disabled={busy}
          className="min-h-12 w-full rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 px-4 font-semibold disabled:opacity-50"
        >
          {busy ? 'Creazione…' : 'Crea e salva'}
        </button>
      </form>
    </MobileShell>
  );
}

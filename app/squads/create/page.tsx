'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from '@/components/app-link';
import { AlertTriangle, CheckCircle2, ImagePlus } from 'lucide-react';

import { MobileShell, ScreenHeader } from '@/components/mobile-shell';
import {
  findSimilarSquad,
  moderateText,
  validatePublicLocation,
} from '@/lib/community-moderation';

const purposes = {
  crew: ['Cosplay Crew', 'Cosplay Contest Team'],
  meetup: ['Event Meetup', 'Photo Meetup', 'Travel Group for Event'],
} as const;

export default function CreateSquadPage() {
  const [kind, setKind] = useState<'crew' | 'meetup'>('crew');
  const [purpose, setPurpose] = useState<string>('Cosplay Crew');
  const [duplicate, setDuplicate] =
    useState<ReturnType<typeof findSimilarSquad>>();
  const [error, setError] = useState('');
  const [created, setCreated] = useState(false);
  function submit(formData: FormData) {
    const field = (name: string) => {
      const value = formData.get(name);
      return typeof value === 'string' ? value : '';
    };
    const name = field('name');
    const description = field('description');
    const event = field('event');
    const location = field('location');
    const date = field('date');
    if (new Date(`${date}T23:59:59`) < new Date())
      return setError('The date must be in the future.');
    if (!validatePublicLocation(location))
      return setError(
        'Private addresses are not allowed. Use a public venue or approximate area.',
      );
    const match = findSimilarSquad(name, event);
    if (match && !duplicate) return setDuplicate(match);
    const moderation = moderateText(name, description);
    const entries = JSON.parse(localStorage.getItem('cosmora_squads') ?? '[]');
    localStorage.setItem(
      'cosmora_squads',
      JSON.stringify([
        {
          id: crypto.randomUUID(),
          ...Object.fromEntries(formData.entries()),
          status: moderation.status,
        },
        ...entries,
      ]),
    );
    setCreated(true);
  }
  if (created)
    return (
      <MobileShell>
        <div className="flex min-h-[760px] flex-col items-center justify-center px-8 text-center">
          <CheckCircle2 className="size-16 text-emerald-300" />
          <h1 className="mt-5 text-2xl font-semibold">Crew / incontro creato</h1>
          <p className="mt-3 text-sm text-white/50">
            La pubblicazione è attiva oppure in revisione se sono presenti segnali di rischio.
          </p>
          <Link
            href="/squads/one-piece-crew-lucca-2026"
            className="mt-6 grid h-11 w-full place-items-center rounded-xl bg-gradient-to-r from-pink-500 to-violet-500"
          >
            Vedi la crew
          </Link>
        </div>
      </MobileShell>
    );
  return (
    <MobileShell>
      <ScreenHeader title="Crew cosplay / Incontro" back="/community" />
      <section className="px-4 pt-4">
        <h2 className="text-sm font-semibold">Quale vuoi organizzare?</h2>
        <p className="mt-1 text-[9px] text-white/45">
          Guarda gli esempi: la differenza si capisce subito.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Example
            image="/community/squad-example.jpg"
            title="Crew cosplay"
            text="Una squadra coordinata cerca personaggi per partecipare insieme a un evento."
            active={kind === 'crew'}
            onClick={() => {
              setKind('crew');
              setPurpose('Cosplay Crew');
            }}
          />
          <Example
            image="/community/meetup-example.jpg"
            title="Incontro pubblico"
            text="Cosplayer e fotografi si incontrano a un’ora e in un luogo pubblico."
            active={kind === 'meetup'}
            onClick={() => {
              setKind('meetup');
              setPurpose('Event Meetup');
            }}
          />
        </div>
      </section>
      <form action={submit} className="space-y-3 p-4">
        {error && (
          <p className="rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-[9px] text-red-200">
            {error}
          </p>
        )}
        {duplicate && (
          <section className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4">
            <div className="flex gap-2">
              <AlertTriangle className="size-5 text-amber-300" />
              <div>
                <p className="text-xs font-medium">
                  Esiste già qualcosa di simile.
                </p>
                <p className="mt-1 text-[9px] text-white/55">
                  {duplicate.name}
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link
                href={`/squads/${duplicate.slug}`}
                className="grid h-9 place-items-center rounded-lg bg-violet-500/20 text-[9px] text-violet-200"
              >
                Vedi / Partecipa
              </Link>
              <button
                type="submit"
                className="rounded-lg border border-white/10 text-[9px]"
              >
                Crea comunque
              </button>
            </div>
          </section>
        )}
        <label className="grid h-28 place-items-center rounded-2xl border border-dashed border-violet-400/40 bg-violet-500/5">
          <span className="text-center text-[9px] text-white/50">
            <ImagePlus className="mx-auto mb-2 size-5" />
            Aggiungi immagine di copertina
          </span>
          <input type="file" accept="image/*" className="sr-only" />
        </label>
        <input
          required
          name="name"
          placeholder={kind === 'crew' ? 'Nome della crew' : 'Titolo dell’incontro'}
          className="checkout-input"
        />
        <select required name="type" value={purpose} onChange={(event) => setPurpose(event.target.value)} className="checkout-input">
          {purposes[kind].map((type) => (
            <option key={type}>{type}</option>
          ))}
        </select>
        <textarea
          required
          minLength={12}
          name="description"
          placeholder="Descrivi chiaramente lo scopo"
          className="checkout-input min-h-24 resize-none py-3"
        />
        <input
          name="fandom"
          placeholder="Serie / fandom collegato"
          className="checkout-input"
        />
        {kind === 'crew' && <input name="characters" placeholder="Personaggi cercati, separati da virgole" className="checkout-input" />}
        <select name="event" className="checkout-input">
          <option value="">Nessun evento collegato</option>
          <option>Lucca Comics & Games 2026</option>
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input
            required
            name="city"
            placeholder="Città"
            className="checkout-input"
          />
          <input required name="date" type="date" className="checkout-input" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input name="time" type="time" className="checkout-input" />
          <input
            name="maxMembers"
            min="2"
            type="number"
            placeholder="Partecipanti max"
            className="checkout-input"
          />
        </div>
        <input
          required
          name="location"
          placeholder="Luogo pubblico o zona approssimativa"
          className="checkout-input"
        />
        <div className="grid grid-cols-2 gap-2">
          <select name="privacy" className="checkout-input">
            <option>Pubblico</option>
            <option>Privato</option>
          </select>
          <label className="flex items-center gap-2 rounded-xl border border-white/8 px-3 text-[9px]">
            <input name="approval" type="checkbox" />
            Richiedi approvazione
          </label>
        </div>
        <textarea
          required
          name="rules"
          placeholder="Regole"
          className="checkout-input min-h-20 resize-none py-3"
        />
        <button className="h-12 w-full rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 text-sm font-medium">
          {kind === 'crew' ? 'Crea la crew' : 'Crea l’incontro'}
        </button>
      </form>
    </MobileShell>
  );
}

function Example({
  image,
  title,
  text,
  active,
  onClick,
}: {
  image: string;
  title: string;
  text: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`overflow-hidden rounded-2xl border bg-[#111225] text-left transition ${active ? 'border-pink-400 ring-1 ring-pink-400/30' : 'border-white/10'}`}>
      <div className="relative h-24">
        <Image
          src={image}
          alt={title}
          fill
          sizes="190px"
          className="object-cover"
        />
      </div>
      <div className="p-2.5">
        <h3 className="text-[10px] font-semibold text-pink-200">{title}</h3>
        <p className="mt-1 text-[8px] leading-3 text-white/50">{text}</p>
      </div>
    </button>
  );
}

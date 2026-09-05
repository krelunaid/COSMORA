'use client';
import { rentalsEnabled } from '@/lib/release-features';

import { useEffect, useId, useState } from 'react';
import Image from 'next/image';
import Link from '@/components/app-link';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  ImagePlus,
  LoaderCircle,
  Scissors,
  Sparkles,
  Trash2,
  Undo2,
} from 'lucide-react';

import {
  MobileNav,
  MobileShell,
  ScreenHeader,
} from '@/components/mobile-shell';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function SellPage() {
  const router = useRouter();
  const [published, setPublished] = useState(false);
  const [saleMode, setSaleMode] = useState<'buy' | 'rent' | 'both'>('buy');
  const [photoCount, setPhotoCount] = useState(0);
  const [photoError, setPhotoError] = useState('');
  const [listingPhotos, setListingPhotos] = useState<ListingPhoto[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');

  useEffect(() => {
    let active = true;
    async function checkSeller() {
      const session = await getSupabaseBrowserClient()?.auth.getSession();
      if (!active) return;
      const token = session?.data.session?.access_token;
      if (!token) {
        router.replace('/auth/login');
        return;
      }
      try {
        const response = await fetch('/api/seller/profile', {
          headers: { Authorization: 'Bearer ' + token },
        });
        const result = (await response.json()) as { profile?: unknown };
        if (active && response.ok && !result.profile)
          router.replace('/seller/onboarding');
        else if (active && !response.ok)
          setPublishError(
            'Non riesco a verificare il profilo venditore. Riprova.',
          );
      } catch {
        if (active) setPublishError('Connessione non disponibile. Riprova.');
      }
    }
    void checkSeller();
    return () => {
      active = false;
    };
  }, [router]);
  if (published)
    return (
      <MobileShell className="flex flex-col">
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <CheckCircle2 className="size-16 text-emerald-300" />
          <h1 className="mt-5 text-2xl font-semibold">Listing published</h1>
          <p className="mt-3 text-sm text-white/50">
            Your item is now visible in the COSMORA marketplace.
          </p>
          <Link
            href="/seller"
            className="mt-6 grid h-11 w-full place-items-center rounded-xl bg-gradient-to-r from-pink-500 to-violet-500"
          >
            Open Seller Dashboard
          </Link>
        </div>
        <MobileNav active="sell" />
      </MobileShell>
    );

  return (
    <MobileShell className="flex flex-col">
      <ScreenHeader
        title="Create Listing"
        back="/"
        action={
          <Link href="/seller" className="text-xs text-pink-300">
            Dashboard
          </Link>
        }
      />
      <div className="mx-4 mt-4 flex items-center justify-between rounded-xl border border-violet-400/20 bg-violet-400/5 px-3 py-2 text-xs">
        <span>Publishing with your seller profile</span>
        <Link href="/seller/onboarding" className="text-pink-300">
          Edit profile
        </Link>
      </div>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!photoCount) {
            setPhotoError('Aggiungi almeno una foto del prodotto.');
            return;
          }
          const supabase = getSupabaseBrowserClient();
          if (!supabase) {
            setPublishError(
              'Il collegamento al database non è ancora configurato.',
            );
            return;
          }
          setPublishing(true);
          setPublishError('');
          const session = await supabase.auth.getSession();
          const token = session.data.session?.access_token;
          if (!token) {
            router.push('/auth/login');
            return;
          }
          const body = new FormData(event.currentTarget);
          body.set('saleMode', saleMode);
          for (const [index, photo] of listingPhotos.entries()) {
            if (photo.processedUrl) {
              const blob = await fetch(photo.processedUrl).then((response) =>
                response.blob(),
              );
              body.append(
                'photos',
                new File(
                  [blob],
                  `${photo.file.name.replace(/\.[^.]+$/, '')}-cutout.png`,
                  { type: 'image/png' },
                ),
              );
              body.set(`photoProcessed:${index}`, 'true');
            } else {
              body.append('photos', photo.file);
            }
          }
          const response = await fetch('/api/listings', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body,
          });
          const result = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          setPublishing(false);
          if (!response.ok) {
            setPublishError(result?.error ?? 'Pubblicazione non riuscita.');
            return;
          }
          setPublished(true);
        }}
        className="flex-1 space-y-4 px-4 py-5"
      >
        <ListingPhotoUploader
          onPhotosChange={setListingPhotos}
          onCountChange={(count) => {
            setPhotoCount(count);
            if (count) setPhotoError('');
          }}
        />
        {photoError && (
          <p role="alert" className="-mt-2 text-xs text-rose-300">
            {photoError}
          </p>
        )}
        <input
          name="title"
          required
          placeholder="Listing title"
          className="checkout-input"
        />
        <textarea
          name="description"
          required
          placeholder="Describe your item, condition and what is included"
          className="checkout-input min-h-28 resize-none py-3"
        />
        <div className="grid grid-cols-2 gap-2">
          <select name="category" className="checkout-input">
            <option>Cosplay</option>
            <option>Comics & Manga</option>
            <option>Figures & Collectibles</option>
            <option>Trading Cards</option>
            <option>Gaming</option>
            <option>Artist Alley</option>
          </select>
          <select name="condition" className="checkout-input">
            <option>New</option>
            <option>Like New</option>
            <option>Used</option>
          </select>
        </div>
        <div>
          <p className="mb-2 text-sm text-white/70">{rentalsEnabled ? 'Disponibile per' : 'Annuncio di vendita · pagamenti in app non disponibili'}</p>
          <div className="grid grid-cols-3 gap-2">
            {(rentalsEnabled ? (['buy', 'rent', 'both'] as const) : []).map((mode) => (
              <button
                type="button"
                onClick={() => setSaleMode(mode)}
                key={mode}
                className={`h-10 rounded-xl border text-xs uppercase ${saleMode === mode ? 'border-pink-400 bg-pink-400/10 text-pink-300' : 'border-white/10 text-white/50'}`}
              >
                {mode === 'both' ? 'Buy + Rent' : mode}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {saleMode !== 'rent' && (
            <input
              required
              name="salePrice"
              type="number"
              min="0"
              step="0.01"
              placeholder="Sale price (€)"
              className="checkout-input"
            />
          )}
          {saleMode !== 'buy' && (
            <input
              required
              name="rentalPrice"
              type="number"
              min="0"
              step="0.01"
              placeholder="Rental price (€)"
              className="checkout-input"
            />
          )}
          {saleMode !== 'buy' && (
            <input
              required
              name="rentalDays"
              type="number"
              min="1"
              placeholder="Rental days"
              className="checkout-input"
            />
          )}
          {saleMode !== 'buy' && (
            <input
              required
              name="deposit"
              type="number"
              min="0"
              step="0.01"
              placeholder="Deposit (€)"
              className="checkout-input"
            />
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            placeholder="Size (e.g. M / EU 38)"
            className="checkout-input"
          />
          <input placeholder="Brand / Fan-made" className="checkout-input" />
        </div>
        <input
          placeholder="Measurements (bust, waist, height…)"
          className="checkout-input"
        />
        <div className="grid grid-cols-2 gap-2">
          <select className="checkout-input">
            <option>Italy</option>
            <option>France</option>
            <option>Germany</option>
            <option>Spain</option>
            <option>Belgium</option>
            <option>Netherlands</option>
          </select>
          <input placeholder="Estimated delivery" className="checkout-input" />
        </div>
        <label className="flex items-center gap-2 rounded-xl border border-white/8 p-3 text-xs">
          <input type="checkbox" />
          Local hand delivery at a public meeting point
        </label>
        <label className="flex items-start gap-2 rounded-xl border border-white/8 p-3 text-xs leading-4 text-white/55">
          <input required type="checkbox" className="mt-0.5" />I confirm the
          listing is accurate, legal, and clearly identifies official
          merchandise or fan-made work.
        </label>
        {publishError && (
          <p role="alert" className="text-xs text-rose-300">
            {publishError}
          </p>
        )}
        <button
          disabled={publishing}
          className="h-12 w-full rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 text-sm font-medium disabled:opacity-60"
        >
          {publishing ? 'Pubblicazione…' : 'Publish Listing'}
        </button>
      </form>
      <MobileNav active="sell" />
    </MobileShell>
  );
}

type ListingPhoto = {
  id: string;
  file: File;
  originalUrl: string;
  processedUrl?: string;
  processing?: boolean;
  error?: string;
};

function ListingPhotoUploader({
  onCountChange,
  onPhotosChange,
}: {
  onCountChange: (count: number) => void;
  onPhotosChange: (photos: ListingPhoto[]) => void;
}) {
  const inputId = useId();
  const [photos, setPhotos] = useState<ListingPhoto[]>([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    onPhotosChange(photos);
  }, [photos, onPhotosChange]);

  function addFiles(files: FileList | File[]) {
    const accepted = Array.from(files).filter(
      (file) =>
        ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) &&
        file.size <= 10 * 1024 * 1024,
    );
    if (!accepted.length) {
      setError('Usa foto JPG, PNG o WebP fino a 10 MB.');
      return;
    }
    setPhotos((current) => {
      const available = Math.max(0, 8 - current.length);
      const next = [
        ...current,
        ...accepted.slice(0, available).map((file) => ({
          id: crypto.randomUUID(),
          file,
          originalUrl: URL.createObjectURL(file),
        })),
      ];
      onCountChange(next.length);
      return next;
    });
    setError(accepted.length > 8 ? 'Puoi inserire al massimo 8 foto.' : '');
  }

  function removePhoto(id: string) {
    setPhotos((current) => {
      const removed = current.find((photo) => photo.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.originalUrl);
        if (removed.processedUrl) URL.revokeObjectURL(removed.processedUrl);
      }
      const next = current.filter((photo) => photo.id !== id);
      onCountChange(next.length);
      return next;
    });
  }

  async function removeBackground(id: string) {
    const photo = photos.find((item) => item.id === id);
    if (!photo) return;
    setPhotos((current) =>
      current.map((item) =>
        item.id === id ? { ...item, processing: true, error: undefined } : item,
      ),
    );
    const body = new FormData();
    body.append('image', photo.file);
    try {
      const response = await fetch('/api/images/remove-background', {
        method: 'POST',
        body,
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(result?.error ?? 'Scontorno non disponibile.');
      }
      const processedUrl = URL.createObjectURL(await response.blob());
      setPhotos((current) =>
        current.map((item) => {
          if (item.id !== id) return item;
          if (item.processedUrl) URL.revokeObjectURL(item.processedUrl);
          return { ...item, processedUrl, processing: false };
        }),
      );
    } catch (cause) {
      setPhotos((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                processing: false,
                error:
                  cause instanceof Error
                    ? cause.message
                    : 'Scontorno non disponibile.',
              }
            : item,
        ),
      );
    }
  }

  function restoreOriginal(id: string) {
    setPhotos((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        if (item.processedUrl) URL.revokeObjectURL(item.processedUrl);
        return { ...item, processedUrl: undefined, error: undefined };
      }),
    );
  }

  if (!photos.length)
    return (
      <div>
        <button
          type="button"
          aria-label="Aggiungi fino a 8 foto del prodotto"
          onClick={() => document.getElementById(inputId)?.click()}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            addFiles(event.dataTransfer.files);
          }}
          className={`grid h-52 w-full cursor-pointer place-items-center overflow-hidden rounded-2xl border border-dashed transition sm:h-56 ${dragging ? 'border-pink-300 bg-pink-400/10' : 'border-violet-400/40 bg-[radial-gradient(circle_at_50%_35%,rgba(139,92,246,.16),transparent_55%)]'}`}
        >
          <span className="text-center text-xs text-white/55">
            <span className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl border border-violet-300/20 bg-violet-400/10">
              <ImagePlus className="size-6 text-violet-200" />
            </span>
            <b className="block text-sm text-white">Aggiungi le foto</b>
            <span className="mt-1 block">
              Tocca oppure trascina qui · massimo 8
            </span>
            <span className="mt-1 block text-xs text-white/30">
              JPG, PNG o WebP · 10 MB per foto
            </span>
          </span>
        </button>
        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(event) =>
            event.target.files && addFiles(event.target.files)
          }
          className="sr-only"
        />
        {error && (
          <p role="alert" className="mt-2 text-xs text-rose-300">
            {error}
          </p>
        )}
      </div>
    );

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {photos.map((photo, index) => (
          <article
            key={photo.id}
            className={`${index === 0 ? 'col-span-2' : ''} overflow-hidden rounded-2xl border border-white/10 bg-[#111225]`}
          >
            <div
              className={`${index === 0 ? 'h-64' : 'h-36'} relative bg-[linear-gradient(45deg,#17172b_25%,transparent_25%),linear-gradient(-45deg,#17172b_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#17172b_75%),linear-gradient(-45deg,transparent_75%,#17172b_75%)] bg-[length:18px_18px] bg-[position:0_0,0_9px,9px_-9px,-9px_0px]`}
            >
              <Image
                src={photo.processedUrl ?? photo.originalUrl}
                alt={`Anteprima foto ${index + 1}`}
                fill
                unoptimized
                sizes={index === 0 ? '398px' : '190px'}
                className="object-contain"
              />
              {index === 0 && (
                <span className="absolute left-2 top-2 rounded-full bg-pink-500 px-2 py-1 text-xs font-semibold">
                  COPERTINA
                </span>
              )}
              <button
                type="button"
                onClick={() => removePhoto(photo.id)}
                aria-label="Elimina foto"
                className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-black/65"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
            <div className="p-2">
              {photo.processedUrl ? (
                <button
                  type="button"
                  onClick={() => restoreOriginal(photo.id)}
                  className="flex h-8 w-full items-center justify-center gap-1 rounded-lg border border-white/10 text-xs text-white/60"
                >
                  <Undo2 className="size-3" />
                  Usa originale
                </button>
              ) : (
                <button
                  type="button"
                  disabled={photo.processing}
                  onClick={() => removeBackground(photo.id)}
                  className="flex h-8 w-full items-center justify-center gap-1 rounded-lg border border-violet-400/25 bg-violet-400/8 text-xs text-violet-200 disabled:opacity-60"
                >
                  {photo.processing ? (
                    <LoaderCircle className="size-3 animate-spin" />
                  ) : (
                    <Scissors className="size-3" />
                  )}
                  {photo.processing ? 'Scontorno…' : 'Rimuovi sfondo · Beta'}
                </button>
              )}
              {photo.error && (
                <p className="mt-2 text-xs leading-3 text-amber-200/70">
                  {photo.error} L’originale è rimasto intatto.
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
      <label
        htmlFor={inputId}
        className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-violet-400/30 text-xs text-violet-200"
      >
        <ImagePlus className="size-4" />
        Aggiungi altre foto
        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(event) =>
            event.target.files && addFiles(event.target.files)
          }
          className="sr-only"
        />
      </label>
      <p className="flex items-start gap-2 rounded-xl border border-white/8 p-3 text-xs leading-3 text-white/40">
        <Sparkles className="mt-0.5 size-3 shrink-0 text-pink-300" />
        Lo scontorno è facoltativo e può sbagliare su capelli, trasparenze o
        oggetti simili allo sfondo. Controlla sempre l’anteprima; l’originale
        non viene eliminato.
      </p>
      {error && (
        <p role="alert" className="text-xs text-rose-300">
          {error}
        </p>
      )}
    </section>
  );
}

'use client';
import { useI18n } from '@/components/i18n-provider';
import { saleText, type SaleKey } from '@/lib/i18n/sale';

import { useEffect, useId, useRef, useState } from 'react';
import {
  canUseNativePhotoPicker,
  pickNativeCommunityPhotos,
  renderFileAsJpeg,
} from '@/lib/community-media-client';
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
  const { locale } = useI18n();
  const t = (key: SaleKey) => saleText(locale, key);
  const [shippingMode, setShippingMode] = useState('courier');
  const [published, setPublished] = useState(false);
  const saleMode = 'buy';
  const [photoCount, setPhotoCount] = useState(0);
  const [photoError, setPhotoError] = useState('');
  const [listingPhotos, setListingPhotos] = useState<ListingPhoto[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [preparingPhotos, setPreparingPhotos] = useState(false);

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
          setPublishError(saleText(locale, 'error'));
      } catch {
        if (active) setPublishError(saleText(locale, 'error'));
      }
    }
    void checkSeller();
    return () => {
      active = false;
    };
  }, [router, locale]);
  if (published)
    return (
      <MobileShell className="flex flex-col">
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <CheckCircle2 className="size-16 text-emerald-300" />
          <h1 className="mt-5 text-2xl font-semibold">{t('published')}</h1>
          <p className="mt-3 text-sm text-white/50">{t('visible')}</p>
          <Link
            href="/seller"
            className="mt-6 grid h-11 w-full place-items-center rounded-xl bg-gradient-to-r from-pink-500 to-violet-500"
          >
            {t('dashboard')}
          </Link>
        </div>
        <MobileNav active="sell" />
      </MobileShell>
    );

  return (
    <MobileShell className="flex flex-col">
      <ScreenHeader
        title={t('title')}
        back="/"
        action={
          <Link href="/seller" className="text-sm text-pink-300">
            {t('dashboard')}
          </Link>
        }
      />
      <div className="mx-4 mt-4 flex items-center justify-between rounded-xl border border-violet-400/20 bg-violet-400/5 px-3 py-2 text-sm">
        <span>{t('profile')}</span>
        <Link href="/seller/onboarding" className="text-pink-300">
          {t('edit')}
        </Link>
      </div>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          if (preparingPhotos || publishing) return;
          if (!photoCount) {
            setPhotoError(t('requiredPhoto'));
            return;
          }
          const supabase = getSupabaseBrowserClient();
          if (!supabase) {
            setPublishError(t('error'));
            return;
          }
          setPublishing(true);
          setPublishError('');
          try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;
            if (!token) {
              router.push('/auth/login');
              return;
            }
            const body = new FormData(form);
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

            setPublishing(false);
            if (!response.ok) {
              setPublishError(
                response.status === 400 ? t('invalid') : t('error'),
              );
              return;
            }
            setPublished(true);
          } catch {
            setPublishError(t('error'));
          } finally {
            setPublishing(false);
          }
        }}
        onInvalid={(event) => {
          event.preventDefault();
          setPublishError(t('invalid'));
        }}
        className="flex-1 space-y-5 px-4 py-5 text-base"
      >
        <p className="text-base text-white/75">{t('intro')}</p>
        <h2 className="text-xl font-semibold">{t('photos')} *</h2>
        <ListingPhotoUploader
          onBusyChange={setPreparingPhotos}
          onPhotosChange={setListingPhotos}
          onCountChange={(count) => {
            setPhotoCount(count);
            if (count) setPhotoError('');
          }}
        />
        {photoError && (
          <p role="alert" className="-mt-2 text-sm text-rose-300">
            {photoError}
          </p>
        )}
        <fieldset className="space-y-4 rounded-2xl border border-white/15 p-4">
          <legend className="px-2 text-xl font-semibold">{t('details')}</legend>
          <label className="block">
            {t('name')}
            <input
              name="title"
              required
              minLength={3}
              maxLength={120}
              placeholder={t('nameHint')}
              className="checkout-input mt-2"
            />
          </label>
          <label className="block">
            {t('description')}
            <textarea
              name="description"
              required
              minLength={10}
              maxLength={5000}
              placeholder={t('descriptionHint')}
              className="checkout-input mt-2 min-h-36 py-3"
            />
          </label>
          <label className="block">
            {t('category')}
            <select name="category" className="checkout-input mt-2">
              {(
                [
                  ['Cosplay', 'cosplay'],
                  ['Comics & Manga', 'comics'],
                  ['Figures & Collectibles', 'figures'],
                  ['Trading Cards', 'cards'],
                  ['Gaming', 'gaming'],
                  ['Artist Alley', 'artist'],
                ] as const
              ).map(([value, key]) => (
                <option key={value} value={value}>
                  {t(key)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            {t('condition')}
            <select name="condition" className="checkout-input mt-2">
              {(
                [
                  ['New', 'new'],
                  ['Like New', 'likeNew'],
                  ['Used', 'used'],
                ] as const
              ).map(([value, key]) => (
                <option key={value} value={value}>
                  {t(key)}
                </option>
              ))}
            </select>
          </label>
        </fieldset>
        <fieldset className="space-y-4 rounded-2xl border border-white/15 p-4">
          <legend className="px-2 text-xl font-semibold">
            {t('delivery')}
          </legend>
          <label className="block">
            {t('price')}
            <input
              required
              name="salePrice"
              type="number"
              min="0"
              step="0.01"
              className="checkout-input mt-2"
            />
          </label>
          <p className="text-white/75">{t('shippingInfo')}</p>
          <label className="block">
            {t('method')}
            <select
              name="shippingMode"
              value={shippingMode}
              onChange={(event) => setShippingMode(event.target.value)}
              className="checkout-input mt-2"
            >
              <option value="courier">{t('courier')}</option>
              <option value="pickup">{t('pickup')}</option>
            </select>
          </label>
          <label className="block">
            {t('carrier')}
            <input
              name="shippingMethod"
              required
              minLength={2}
              maxLength={120}
              className="checkout-input mt-2"
            />
          </label>
          {shippingMode === 'pickup' ? (
            <input type="hidden" name="shippingCost" value="0" />
          ) : (
            <label className="block">
              {t('cost')}
              <input
                name="shippingCost"
                required
                type="number"
                min="0"
                max="10000"
                step="0.01"
                className="checkout-input mt-2"
              />
            </label>
          )}
          <label className="block">
            {t('time')}
            <input
              name="shippingTime"
              required
              minLength={2}
              maxLength={200}
              placeholder={t('timeHint')}
              className="checkout-input mt-2"
            />
          </label>
          <p className="rounded-xl bg-violet-500/10 p-3 text-sm text-violet-200">
            {t('noPayments')}
          </p>
        </fieldset>
        <label className="flex items-start gap-3 rounded-xl border border-white/15 p-4 text-base leading-relaxed">
          <input required type="checkbox" className="mt-1 size-5 shrink-0" />
          {t('confirm')}
        </label>
        {publishError && (
          <p role="alert" className="text-sm text-rose-300">
            {publishError}
          </p>
        )}
        <button
          disabled={publishing || preparingPhotos}
          className="h-12 w-full rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 text-sm font-medium disabled:opacity-60"
        >
          {publishing
            ? t('publishing')
            : preparingPhotos
              ? t('preparing')
              : t('publish')}
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
  onBusyChange,
}: {
  onCountChange: (count: number) => void;
  onPhotosChange: (photos: ListingPhoto[]) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const { locale } = useI18n();
  const t = (key: SaleKey) => saleText(locale, key);
  const inputId = useId();
  const [photos, setPhotos] = useState<ListingPhoto[]>([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const photosRef = useRef<ListingPhoto[]>([]);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(() => {
    onBusyChange(busy || photos.some((photo) => photo.processing));
  }, [busy, photos, onBusyChange]);
  useEffect(
    () => () => {
      for (const photo of photosRef.current) {
        URL.revokeObjectURL(photo.originalUrl);
        if (photo.processedUrl) URL.revokeObjectURL(photo.processedUrl);
      }
    },
    [],
  );

  async function openPicker() {
    if (busyRef.current) return;
    if (!canUseNativePhotoPicker()) {
      document.getElementById(inputId)?.click();
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      const files = await pickNativeCommunityPhotos(8 - photos.length, true);
      if (files?.length) await addFiles(files);
    } catch {
      setError(t('photoFail'));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  useEffect(() => {
    onPhotosChange(photos);
  }, [photos, onPhotosChange]);

  async function addFiles(files: FileList | File[]) {
    const incoming = Array.from(files);
    const accepted: File[] = [];
    let failed = 0;
    setBusy(true);
    for (const file of incoming.slice(0, Math.max(0, 8 - photos.length))) {
      try {
        if (file.size > 40 * 1024 * 1024) throw new Error('too large');
        const normalized = await renderFileAsJpeg(file);
        if (normalized.size > 10 * 1024 * 1024) throw new Error('too large');
        accepted.push(normalized);
      } catch {
        failed++;
      }
    }
    setBusy(false);
    if (!accepted.length) {
      setError(t('photoFail'));
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
      return next;
    });
    setError(
      failed
        ? t('someFail')
        : incoming.length > 8 - photos.length
          ? t('max')
          : '',
    );
  }

  useEffect(() => {
    onCountChange(photos.length);
  }, [photos.length, onCountChange]);

  function removePhoto(id: string) {
    setPhotos((current) => {
      const removed = current.find((photo) => photo.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.originalUrl);
        if (removed.processedUrl) URL.revokeObjectURL(removed.processedUrl);
      }
      const next = current.filter((photo) => photo.id !== id);
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
        throw new Error(result?.error ?? t('cutFail'));
      }
      const processedUrl = URL.createObjectURL(await response.blob());
      setPhotos((current) =>
        current.map((item) => {
          if (item.id !== id) return item;
          if (item.processedUrl) URL.revokeObjectURL(item.processedUrl);
          return { ...item, processedUrl, processing: false };
        }),
      );
    } catch {
      setPhotos((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                processing: false,
                error: t('cutFail'),
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
          aria-label={t('add')}
          onClick={() => void openPicker()}
          disabled={busy}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void addFiles(event.dataTransfer.files);
          }}
          className={`grid h-52 w-full cursor-pointer place-items-center overflow-hidden rounded-2xl border border-dashed transition sm:h-56 ${dragging ? 'border-pink-300 bg-pink-400/10' : 'border-violet-400/40 bg-[radial-gradient(circle_at_50%_35%,rgba(139,92,246,.16),transparent_55%)]'}`}
        >
          <span className="text-center text-sm text-white/55">
            <span className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl border border-violet-300/20 bg-violet-400/10">
              <ImagePlus className="size-6 text-violet-200" />
            </span>
            <b className="block text-sm text-white">
              {busy ? t('preparing') : t('add')}
            </b>
            <span className="mt-1 block">{t('drop')}</span>
            <span className="mt-1 block text-sm text-white/65">
              {t('formats')}
            </span>
          </span>
        </button>
        <input
          id={inputId}
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          disabled={busy}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = '';
            if (files.length) void addFiles(files);
          }}
          className="sr-only"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => document.getElementById(inputId)?.click()}
          className="mt-3 min-h-11 text-base text-pink-300"
        >
          {t('files')}
        </button>
        {error && (
          <p role="alert" className="mt-2 text-sm text-rose-300">
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
                alt={`${t('preview')} ${index + 1}`}
                fill
                unoptimized
                sizes={index === 0 ? '398px' : '190px'}
                className="object-contain"
              />
              {index === 0 && (
                <span className="absolute left-2 top-2 rounded-full bg-pink-500 px-2 py-1 text-sm font-semibold">
                  {t('cover')}
                </span>
              )}
              <button
                type="button"
                onClick={() => removePhoto(photo.id)}
                aria-label={t('remove')}
                className="absolute right-2 top-2 grid size-11 place-items-center rounded-full bg-black/65"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
            <div className="p-2">
              {photo.processedUrl ? (
                <button
                  type="button"
                  onClick={() => restoreOriginal(photo.id)}
                  className="flex min-h-11 w-full items-center justify-center gap-1 rounded-lg border border-white/10 text-sm text-white/60"
                >
                  <Undo2 className="size-3" />
                  {t('original')}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={photo.processing}
                  onClick={() => removeBackground(photo.id)}
                  className="flex min-h-11 w-full items-center justify-center gap-1 rounded-lg border border-violet-400/25 bg-violet-400/8 text-sm text-violet-200 disabled:opacity-60"
                >
                  {photo.processing ? (
                    <LoaderCircle className="size-3 animate-spin" />
                  ) : (
                    <Scissors className="size-3" />
                  )}
                  {photo.processing ? t('cutting') : t('cut')}
                </button>
              )}
              {photo.error && (
                <p className="mt-2 text-sm leading-relaxed text-amber-200/70">
                  {photo.error}
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
      <div className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-violet-400/30 text-sm text-violet-200">
        <ImagePlus className="size-4" />
        <button
          type="button"
          disabled={busy || photos.length >= 8}
          onClick={() => void openPicker()}
        >
          {busy ? t('preparing') : t('more')}
        </button>
        <input
          id={inputId}
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          disabled={busy}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = '';
            if (files.length) void addFiles(files);
          }}
          className="sr-only"
        />
      </div>
      <button
        type="button"
        disabled={busy || photos.length >= 8}
        onClick={() => document.getElementById(inputId)?.click()}
        className="min-h-11 text-base text-pink-300"
      >
        {t('files')}
      </button>
      <p className="flex items-start gap-2 rounded-xl border border-white/8 p-3 text-sm leading-relaxed text-white/65">
        <Sparkles className="mt-0.5 size-3 shrink-0 text-pink-300" />
        {t('cutHint')}
      </p>
      {error && (
        <p role="alert" className="text-sm text-rose-300">
          {error}
        </p>
      )}
    </section>
  );
}

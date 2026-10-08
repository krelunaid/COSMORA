'use client';
import { CommunityRulesNotice } from '@/components/community-rules-notice';
import { apiFetch } from '@/lib/api-fetch';
import { AccountRequestError } from '@/lib/account-http';
import { readFormResponse } from '@/lib/form-response';
import { useI18n } from '@/components/i18n-provider';
import { saleText, type SaleKey } from '@/lib/i18n/sale';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';

import { useEffect, useId, useRef, useState } from 'react';
import { renderFileAsJpeg } from '@/lib/community-media-client';
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

type ListingFormControl =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;

function isListingFormControl(
  control: EventTarget | Element,
): control is ListingFormControl {
  return (
    control instanceof HTMLInputElement ||
    control instanceof HTMLSelectElement ||
    control instanceof HTMLTextAreaElement
  );
}

export default function SellPage() {
  const router = useRouter();
  const { locale } = useI18n();
  const t = (key: SaleKey) => saleText(locale, key);
  const [shippingMode, setShippingMode] = useState('courier');
  const [shippingCarrier, setShippingCarrier] = useState('');
  const [published, setPublished] = useState(false);
  const saleMode = 'buy';
  const [photoCount, setPhotoCount] = useState(0);
  const [photoError, setPhotoError] = useState('');
  const [listingPhotos, setListingPhotos] = useState<ListingPhoto[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [preparingPhotos, setPreparingPhotos] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const formId = useId();
  const photoSectionRef = useRef<HTMLDivElement>(null);

  function validateControl(control: ListingFormControl) {
    control.setCustomValidity('');
    if (!control.willValidate) return '';
    const textControl =
      control instanceof HTMLTextAreaElement ||
      (control instanceof HTMLInputElement && control.type === 'text');
    const invalidLength =
      textControl &&
      ((control.required &&
        control.value.trim().length < Math.max(1, control.minLength)) ||
        (control.maxLength >= 0 &&
          control.value.trim().length > control.maxLength));
    if (!invalidLength && control.validity.valid) return '';
    const messages: Record<string, SaleKey> = {
      title: 'invalidTitle',
      description: 'invalidDescription',
      category: 'invalidCategory',
      condition: 'invalidCondition',
      salePrice: 'invalidPrice',
      shippingMethod:
        shippingMode === 'pickup' ? 'invalidPickup' : 'invalidCarrier',
      shippingCarrierOther: 'invalidCarrierName',
      shippingCost: 'invalidShippingCost',
      shippingTime: 'invalidShippingTime',
      confirmation: 'invalidConfirmation',
    };
    const message = t(messages[control.name] ?? 'invalid');
    control.setCustomValidity(message);
    return message;
  }

  function clearFieldErrors(...names: string[]) {
    setFieldErrors((current) => {
      const next = { ...current };
      for (const name of names) delete next[name];
      return next;
    });
  }

  function fieldAccessibility(name: string) {
    return {
      'aria-invalid': Boolean(fieldErrors[name]),
      'aria-describedby': fieldErrors[name]
        ? `${formId}-${name}-error`
        : undefined,
    };
  }

  function fieldError(name: string) {
    return fieldErrors[name] ? (
      <span
        id={`${formId}-${name}-error`}
        role="alert"
        className="mt-2 block text-sm text-rose-300"
      >
        {fieldErrors[name]}
      </span>
    ) : null;
  }

  useEffect(() => {
    let active = true;
    async function checkSeller() {
      try {
        const session = await getSupabaseBrowserClient()?.auth.getSession();
        if (!active) return;
        if (session?.error) throw session.error;
        const token = session?.data.session?.access_token;
        if (!token) {
          router.replace('/auth/login');
          return;
        }
        const response = await apiFetch('/api/seller/profile', {
          headers: { Authorization: 'Bearer ' + token },
        });
        const result = await readFormResponse<{ profile?: unknown }>(response, saleText(locale, 'error'));
        if (active && !result.profile)
          router.replace('/seller/onboarding');
      } catch (error) {
        if (active) setPublishError(error instanceof AccountRequestError ? error.message : saleText(locale, 'error'));
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
          <CheckCircle2 className="size-16 text-amber-300" />
          <h1 className="mt-5 text-2xl font-semibold">{t('submittedReview')}</h1>
          <p className="mt-3 text-sm text-white/50">{t('reviewVisibility')}</p>
          <Link
            href="/seller"
            className="sell-primary-action mt-6 grid h-11 w-full place-items-center rounded-xl"
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
        onChange={(event) => {
          const control = event.target;
          if (
            isListingFormControl(control) &&
            fieldErrors[control.name] &&
            !validateControl(control)
          ) {
            clearFieldErrors(control.name);
          }
        }}
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          if (preparingPhotos || publishing) return;
          setPublishError('');
          const errors: Record<string, string> = {};
          let firstInvalid: ListingFormControl | undefined;
          for (const control of Array.from(form.elements)) {
            if (!isListingFormControl(control)) continue;
            const message = validateControl(control);
            if (message) {
              errors[control.name] = message;
              firstInvalid ??= control;
            }
          }
          setFieldErrors(errors);
          setPhotoError(photoCount ? '' : t('requiredPhoto'));
          if (!photoCount || firstInvalid) {
            const target = !photoCount ? photoSectionRef.current : firstInvalid;
            target?.focus({ preventScroll: true });
            target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
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
            if (session.error) throw session.error;
            const token = session.data.session?.access_token;
            if (!token) {
              router.push('/auth/login');
              return;
            }
            const body = new FormData(form);
            body.set('saleMode', saleMode);
            if (shippingMode === 'courier' && shippingCarrier === 'other') {
              const otherCarrier = body.get('shippingCarrierOther');
              body.set(
                'shippingMethod',
                typeof otherCarrier === 'string' ? otherCarrier.trim() : '',
              );
            }
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
            const response = await apiFetch('/api/listings', {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
              body,
            });

            await readFormResponse(response, t('error'));
            setPublished(true);
          } catch (error) {
            setPublishError(error instanceof AccountRequestError ? error.message : t('error'));
          } finally {
            setPublishing(false);
          }
        }}
        noValidate
        className="flex-1 space-y-5 px-4 py-5 text-base"
      >
        <p className="text-base text-white/75">{t('intro')}</p>
        <div
          ref={photoSectionRef}
          tabIndex={-1}
          aria-describedby={photoError ? `${formId}-photos-error` : undefined}
          className="space-y-5"
        >
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
            <p
              id={`${formId}-photos-error`}
              role="alert"
              className="-mt-2 text-sm text-rose-300"
            >
              {photoError}
            </p>
          )}
        </div>
        <fieldset className="space-y-4 rounded-2xl border border-white/15 p-4">
          <legend className="px-2 text-xl font-semibold">{t('details')}</legend>
          <label className="block">
            {t('name')}
            <input
              name="title"
              {...fieldAccessibility('title')}
              required
              minLength={3}
              maxLength={120}
              placeholder={t('nameHint')}
              className="checkout-input mt-2"
            />
            {fieldError('title')}
          </label>
          <label className="block">
            {t('description')}
            <textarea
              name="description"
              {...fieldAccessibility('description')}
              required
              minLength={10}
              maxLength={5000}
              placeholder={t('descriptionHint')}
              className="checkout-input mt-2 min-h-36 py-3"
            />
            {fieldError('description')}
          </label>
          <label className="block">
            {t('category')}
            <select
              name="category"
              {...fieldAccessibility('category')}
              required
              defaultValue=""
              className="checkout-input mt-2"
            >
              <option value="" disabled>
                {t('choose')}
              </option>
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
            {fieldError('category')}
          </label>
          <label className="block">
            {t('condition')}
            <select
              name="condition"
              {...fieldAccessibility('condition')}
              required
              defaultValue=""
              className="checkout-input mt-2"
            >
              <option value="" disabled>
                {t('choose')}
              </option>
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
            {fieldError('condition')}
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
              {...fieldAccessibility('salePrice')}
              type="number"
              min="0"
              step="0.01"
              className="checkout-input mt-2"
            />
            {fieldError('salePrice')}
          </label>
          <p className="text-white/75">{t('shippingInfo')}</p>
          <label className="block">
            {t('method')}
            <select
              name="shippingMode"
              value={shippingMode}
              onChange={(event) => {
                setShippingMode(event.target.value);
                clearFieldErrors(
                  'shippingMethod',
                  'shippingCarrierOther',
                  'shippingCost',
                );
              }}
              className="checkout-input mt-2"
            >
              <option value="courier">{t('courier')}</option>
              <option value="pickup">{t('pickup')}</option>
            </select>
          </label>
          <label className="block">
            {t('carrier')}
            {shippingMode === 'pickup' ? (
              <input
                name="shippingMethod"
                {...fieldAccessibility('shippingMethod')}
                required
                minLength={2}
                maxLength={120}
                placeholder={t('pickup')}
                className="checkout-input mt-2"
              />
            ) : (
              <select
                name="shippingMethod"
                {...fieldAccessibility('shippingMethod')}
                required
                value={shippingCarrier}
                onChange={(event) => {
                  setShippingCarrier(event.target.value);
                  if (event.target.value !== 'other')
                    clearFieldErrors('shippingCarrierOther');
                }}
                className="checkout-input mt-2"
              >
                <option value="">{t('chooseCarrier')}</option>
                <option value="Poste Italiane">Poste Italiane</option>
                <option value="BRT">BRT</option>
                <option value="GLS">GLS</option>
                <option value="DHL Express">DHL Express</option>
                <option value="UPS">UPS</option>
                <option value="FedEx">FedEx</option>
                <option value="InPost / locker">InPost / locker</option>
                <option value="other">{t('otherCarrier')}</option>
              </select>
            )}
            {fieldError('shippingMethod')}
          </label>
          {shippingMode === 'courier' && shippingCarrier === 'other' && (
            <label className="block">
              {t('carrierName')}
              <input
                name="shippingCarrierOther"
                {...fieldAccessibility('shippingCarrierOther')}
                required
                minLength={2}
                maxLength={120}
                className="checkout-input mt-2"
              />
              {fieldError('shippingCarrierOther')}
            </label>
          )}
          {shippingMode === 'pickup' ? (
            <input type="hidden" name="shippingCost" value="0" />
          ) : (
            <label className="block">
              {t('cost')}
              <input
                name="shippingCost"
                {...fieldAccessibility('shippingCost')}
                required
                type="number"
                min="0"
                max="10000"
                step="0.01"
                className="checkout-input mt-2"
              />
              {fieldError('shippingCost')}
            </label>
          )}
          <label className="block">
            {t('time')}
            <select
              name="shippingTime"
              {...fieldAccessibility('shippingTime')}
              required
              defaultValue=""
              className="checkout-input mt-2"
            >
              <option value="" disabled>{t('choose')}</option>
              <option value="1–2 giorni lavorativi">{t('timeOneTwo')}</option>
              <option value="2–3 giorni lavorativi">{t('timeTwoThree')}</option>
              <option value="3–5 giorni lavorativi">{t('timeThreeFive')}</option>
              <option value="5–7 giorni lavorativi">{t('timeFiveSeven')}</option>
              <option value="Da concordare">{t('timeToAgree')}</option>
            </select>
            {fieldError('shippingTime')}
          </label>
          <p className="-mt-2 rounded-xl bg-white/5 p-3 text-sm text-white/65">
            {t('timingNote')}
          </p>
          <p className="rounded-xl bg-violet-500/10 p-3 text-sm text-violet-200">
            {t('noPayments')}
          </p>
        </fieldset>
        <label className="flex items-start gap-3 rounded-xl border border-white/15 p-4 text-base leading-relaxed">
          <input
            name="confirmation"
            {...fieldAccessibility('confirmation')}
            required
            type="checkbox"
            className="mt-1 size-5 shrink-0"
          />
          <span>
            {t('confirm')}
            {fieldError('confirmation')}
          </span>
        </label>
        <CommunityRulesNotice />
        {publishError && (
          <p role="alert" className="text-sm text-rose-300">
            {publishError}
          </p>
        )}
        <button
          disabled={publishing || preparingPhotos}
          className="sell-primary-action h-12 w-full rounded-xl text-sm font-medium disabled:opacity-60"
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
  const photosRef = useRef<ListingPhoto[]>([]);
  const [cutRequest, setCutRequest] = useState<string | null>(null);
  const [cutPhase, setCutPhase] = useState<'cutDownload' | 'cutting'>(
    'cutDownload',
  );
  const cutJob = useRef<AbortController | null>(null);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(() => {
    onBusyChange(busy || photos.some((photo) => photo.processing));
  }, [busy, photos, onBusyChange]);
  useEffect(
    () => () => {
      cutJob.current?.abort();
      for (const photo of photosRef.current) {
        URL.revokeObjectURL(photo.originalUrl);
        if (photo.processedUrl) URL.revokeObjectURL(photo.processedUrl);
      }
    },
    [],
  );

  function openPicker() {
    if (busy || photos.length >= 8) return;
    document.getElementById(inputId)?.click();
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
    if (!photo || cutJob.current) return;
    const controller = new AbortController();
    cutJob.current = controller;
    setCutRequest(null);
    setCutPhase('cutDownload');
    setPhotos((current) =>
      current.map((item) =>
        item.id === id ? { ...item, processing: true, error: undefined } : item,
      ),
    );
    try {
      // No AI code or model is loaded until the confirmation action above.
      const { removeBackgroundLocally } =
        await import('@/lib/background-removal-client');
      const blob = await removeBackgroundLocally(
        photo.file,
        controller.signal,
        setCutPhase,
      );
      controller.signal.throwIfAborted();
      const processedUrl = URL.createObjectURL(blob);
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
                error: controller.signal.aborted ? undefined : t('cutFail'),
              }
            : item,
        ),
      );
    } finally {
      cutJob.current = null;
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
          onClick={() => openPicker()}
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
      <AlertDialog
        open={cutRequest !== null}
        onOpenChange={(open) => {
          if (!open) setCutRequest(null);
        }}
      >
        <AlertDialogContent className="border border-violet-400/30 bg-[#111225] text-white">
          <AlertDialogTitle>{t('cutConsent')}</AlertDialogTitle>
          <AlertDialogDescription className="text-base text-white/80">
            {t('cutDownloadInfo')}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">
              {t('cutCancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              onClick={() => {
                if (cutRequest) void removeBackground(cutRequest);
              }}
            >
              {t('cutStart')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <p aria-live="polite" className="text-base text-white/75">
        {t('preview')} · {photos.length}/8
      </p>
      <div className="grid grid-cols-2 gap-2">
        {photos.map((photo, index) => (
          <article
            key={photo.id}
            className="overflow-hidden rounded-2xl border border-white/10 bg-[#111225]"
          >
            <div className="relative aspect-square bg-[#17172b]">
              <Image
                src={photo.processedUrl ?? photo.originalUrl}
                alt={`${t('preview')} ${index + 1}`}
                fill
                unoptimized
                sizes="190px"
                className="object-contain"
              />
              {index === 0 && (
                <span className="absolute bottom-2 left-2 rounded-full bg-pink-500 px-2 py-1 text-sm font-semibold">
                  {t('cover')}
                </span>
              )}
              <button
                type="button"
                onClick={() => removePhoto(photo.id)}
                disabled={photo.processing}
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
                  disabled={photos.some((item) => item.processing)}
                  onClick={() => setCutRequest(photo.id)}
                  className="flex min-h-11 w-full items-center justify-center gap-1 rounded-lg border border-violet-400/25 bg-violet-400/8 text-sm text-violet-200 disabled:opacity-60"
                >
                  {photo.processing ? (
                    <LoaderCircle className="size-3 animate-spin" />
                  ) : (
                    <Scissors className="size-3" />
                  )}
                  {photo.processing ? t(cutPhase) : t('cut')}
                </button>
              )}
              {photo.processing && (
                <button
                  type="button"
                  className="min-h-11 w-full text-sm text-pink-300"
                  onClick={() => cutJob.current?.abort()}
                >
                  {t('cutCancel')}
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
        {photos.length < 8 && (
          <button
            type="button"
            disabled={busy}
            onClick={openPicker}
            className="grid aspect-square content-center justify-items-center gap-3 rounded-2xl border border-dashed border-pink-400/50 bg-violet-500/10 p-3 text-base text-violet-200 disabled:opacity-60"
          >
            <ImagePlus className="size-8" />
            {busy ? t('preparing') : t('more')}
          </button>
        )}
      </div>
      <div className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-violet-400/30 text-sm text-violet-200">
        <ImagePlus className="size-4" />
        <button
          type="button"
          disabled={busy || photos.length >= 8}
          onClick={() => openPicker()}
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

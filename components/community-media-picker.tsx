'use client';

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { ImagePlus, Trash2, Video } from 'lucide-react';
import Image from 'next/image';

import {
  canUseNativePhotoPicker,
  normalizeCommunityMediaFile,
  pickNativeCommunityPhotos,
} from '@/lib/community-media-client';
import {
  COMMUNITY_MEDIA_ACCEPT,
  COMMUNITY_MEDIA_LIMIT_ERROR,
  MAX_COMMUNITY_MEDIA_FILES,
  isAllowedCommunityMediaFile,
  isVideoMedia,
} from '@/lib/community-media';

type SelectedMedia = {
  id: string;
  file: File;
  url: string;
  video: boolean;
};

export function CommunityMediaPicker({
  onFilesChange,
  error,
  onError,
}: {
  onFilesChange: (files: File[]) => void;
  error: string;
  onError: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const skipNativeRef = useRef(false);
  const itemsRef = useRef<SelectedMedia[]>([]);
  const [items, setItems] = useState<SelectedMedia[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return () => {
      for (const item of itemsRef.current) URL.revokeObjectURL(item.url);
    };
  }, []);

  function commit(next: SelectedMedia[]) {
    itemsRef.current = next;
    setItems(next);
    onFilesChange(next.map((item) => item.file));
  }

  async function addFiles(list: File[] | FileList) {
    const incoming = Array.from(list);
    if (!incoming.length) return;
    setBusy(true);
    try {
      const remaining = Math.max(
        0,
        MAX_COMMUNITY_MEDIA_FILES - itemsRef.current.length,
      );
      const normalized: File[] = [];
      for (const file of incoming.slice(0, remaining)) {
        const next = await normalizeCommunityMediaFile(file);
        if (!isAllowedCommunityMediaFile(next)) {
          onError(COMMUNITY_MEDIA_LIMIT_ERROR);
          continue;
        }
        normalized.push(next);
      }
      if (!normalized.length) {
        if (incoming.length) onError(COMMUNITY_MEDIA_LIMIT_ERROR);
        return;
      }
      commit([
        ...itemsRef.current,
        ...normalized.map((file) => ({
          id: crypto.randomUUID(),
          file,
          url: URL.createObjectURL(file),
          video: isVideoMedia(file),
        })),
      ]);
      onError(incoming.length > remaining ? COMMUNITY_MEDIA_LIMIT_ERROR : '');
    } finally {
      setBusy(false);
    }
  }

  async function onInputClick(event: MouseEvent<HTMLInputElement>) {
    if (skipNativeRef.current || items.length >= MAX_COMMUNITY_MEDIA_FILES) {
      return;
    }
    if (!canUseNativePhotoPicker()) return;
    event.preventDefault();
    setBusy(true);
    try {
      const native = await pickNativeCommunityPhotos(
        MAX_COMMUNITY_MEDIA_FILES - items.length,
      );
      if (native?.length) {
        await addFiles(native);
        return;
      }
      if (native) return;
      skipNativeRef.current = true;
      event.currentTarget.click();
    } catch {
      onError('Impossibile aprire le foto. Riprova.');
    } finally {
      skipNativeRef.current = false;
      setBusy(false);
    }
  }

  function removeItem(id: string) {
    const removed = itemsRef.current.find((item) => item.id === id);
    if (removed) URL.revokeObjectURL(removed.url);
    commit(itemsRef.current.filter((item) => item.id !== id));
    onError('');
  }

  const canAddMore = items.length < MAX_COMMUNITY_MEDIA_FILES;
  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept={COMMUNITY_MEDIA_ACCEPT}
      multiple
      disabled={busy || !canAddMore}
      aria-label="Foto o video"
      onClick={onInputClick}
      onChange={(event) => {
        if (event.target.files) void addFiles(event.target.files);
        event.target.value = '';
      }}
      className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-wait"
      style={{ fontSize: 16 }}
    />
  );

  return (
    <div className="space-y-2">
      <div className="relative min-h-44 overflow-hidden rounded-2xl border border-dashed border-violet-400/40 bg-violet-500/5">
        {items.length === 0 ? (
          <div className="relative grid h-44 place-items-center">
            <span className="pointer-events-none text-center text-[10px] text-white/55">
              <ImagePlus className="mx-auto mb-2 size-7 text-violet-300" />
              <b className="block text-xs text-white">Foto o video</b>
              <small>Puoi selezionare più foto o un video breve</small>
              {busy && (
                <small className="mt-2 block text-violet-200">
                  Preparazione anteprima…
                </small>
              )}
            </span>
            {fileInput}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 p-2">
            {items.map((item) => (
              <figure
                key={item.id}
                className="relative aspect-square overflow-hidden rounded-xl bg-black/40"
              >
                {item.video ? (
                  <video
                    src={item.url}
                    muted
                    playsInline
                    className="size-full object-cover"
                  />
                ) : (
                  <Image
                    src={item.url}
                    alt={item.file.name || 'Anteprima'}
                    fill
                    unoptimized
                    sizes="140px"
                    className="object-cover"
                  />
                )}
                {item.video && (
                  <Video className="pointer-events-none absolute left-1.5 top-1.5 size-3.5 text-white" />
                )}
                <button
                  type="button"
                  aria-label={`Rimuovi ${item.file.name || 'file'}`}
                  onClick={() => removeItem(item.id)}
                  className="absolute right-1 top-1 z-20 grid size-6 place-items-center rounded-full bg-black/70"
                >
                  <Trash2 className="size-3" />
                </button>
              </figure>
            ))}
            {canAddMore && (
              <div className="relative grid aspect-square place-items-center rounded-xl border border-dashed border-violet-400/35 text-[8px] text-violet-200">
                <span className="pointer-events-none text-center">
                  <ImagePlus className="mx-auto mb-1 size-4" />
                  Aggiungi
                </span>
                {fileInput}
              </div>
            )}
          </div>
        )}
      </div>
      {error && (
        <p role="alert" className="text-[9px] text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}

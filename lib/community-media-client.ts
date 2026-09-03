import { Capacitor } from '@capacitor/core';

import { isHeicLike, isVideoMedia } from '@/lib/community-media';

function isPickerCancel(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /cancel/i.test(message);
}

function loadHtmlImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Impossibile leggere l’immagine.'));
    image.src = url;
  });
}

async function renderFileAsJpeg(file: File) {
  const objectUrl = URL.createObjectURL(file);
  try {
    let source: CanvasImageSource;
    let width: number;
    let height: number;
    let close: (() => void) | undefined;
    try {
      const bitmap = await createImageBitmap(file);
      source = bitmap;
      width = bitmap.width;
      height = bitmap.height;
      close = () => bitmap.close();
    } catch {
      const image = await loadHtmlImage(objectUrl);
      source = image;
      width = image.naturalWidth;
      height = image.naturalHeight;
    }
    if (!width || !height) throw new Error('Immagine vuota.');
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Anteprima non disponibile.');
    context.drawImage(source, 0, 0, width, height);
    close?.();
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) =>
          result
            ? resolve(result)
            : reject(new Error('Conversione JPEG non riuscita.')),
        'image/jpeg',
        0.92,
      );
    });
    const baseName = file.name.replace(/\.(heic|heif)$/i, '');
    const name = baseName.toLowerCase().endsWith('.jpg')
      ? baseName
      : `${baseName || 'photo'}.jpg`;
    return new File([blob], name, {
      type: 'image/jpeg',
      lastModified: file.lastModified,
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function normalizeCommunityMediaFile(file: File): Promise<File> {
  if (isVideoMedia(file) || !isHeicLike(file)) return file;
  try {
    return await renderFileAsJpeg(file);
  } catch {
    return file;
  }
}

export function canUseNativePhotoPicker() {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Camera');
}

export async function pickNativeCommunityPhotos(limit: number) {
  if (limit <= 0 || !canUseNativePhotoPicker()) return null;
  const { Camera, MediaType, MediaTypeSelection } =
    await import('@capacitor/camera');
  try {
    const result = await Camera.chooseFromGallery({
      mediaType: MediaTypeSelection.All,
      allowMultipleSelection: true,
      includeMetadata: true,
      limit,
    });
    const files: File[] = [];
    for (const [index, media] of result.results.entries()) {
      const src = media.webPath;
      if (!src) continue;
      const response = await fetch(src);
      const blob = await response.blob();
      const format = (
        media.metadata?.format ||
        blob.type.split('/')[1] ||
        (media.type === MediaType.Video ? 'mp4' : 'jpeg')
      )
        .replace(/^\./, '')
        .toLowerCase();
      const extension = format === 'jpeg' ? 'jpg' : format;
      const mimeFromFormat =
        extension === 'jpg'
          ? 'image/jpeg'
          : extension === 'mov'
            ? 'video/quicktime'
            : `${media.type === MediaType.Video ? 'video' : 'image'}/${extension}`;
      files.push(
        new File([blob], `cosmora-${Date.now()}-${index}.${extension}`, {
          type: blob.type || mimeFromFormat,
        }),
      );
    }
    return files;
  } catch (error) {
    if (isPickerCancel(error)) return [];
    throw error;
  }
}

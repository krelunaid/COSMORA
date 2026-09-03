import { Capacitor } from '@capacitor/core';

import {
  inferNativeMediaFormat,
  isHeicLike,
  isNativePickerCancel,
  isVideoMedia,
  sniffCommunityMediaType,
} from '@/lib/community-media';

export { inferNativeMediaFormat, isNativePickerCancel };

function mimeFromFormat(extension: string, video: boolean) {
  if (extension === 'jpg') return 'image/jpeg';
  if (extension === 'mov') return 'video/quicktime';
  return `${video ? 'video' : 'image'}/${extension}`;
}

function isVideoNativeType(type: unknown, videoEnum: unknown) {
  return type === videoEnum || type === 1 || type === 'Video';
}

export async function fileFromNativeMedia(
  media: {
    webPath?: string;
    type?: unknown;
    format?: string;
    metadata?: { format?: string };
  },
  index: number,
  videoEnum?: unknown,
): Promise<File | null> {
  const src = media.webPath;
  if (!src) return null;
  const response = await fetch(src);
  const blob = await response.blob();
  const header = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
  const sniffed = sniffCommunityMediaType(header);
  const video =
    isVideoNativeType(media.type, videoEnum) ||
    isVideoMedia({ name: '', type: blob.type || sniffed });
  const extension = inferNativeMediaFormat({
    metadataFormat: media.metadata?.format,
    listedFormat: media.format,
    sniffedType: sniffed,
    blobType: blob.type,
    video,
  });
  return new File([blob], `cosmora-${Date.now()}-${index}.${extension}`, {
    type: blob.type || sniffed || mimeFromFormat(extension, video),
  });
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

async function filesFromGalleryResults(
  results: Array<{
    webPath?: string;
    type?: unknown;
    format?: string;
    metadata?: { format?: string };
  }>,
  videoEnum?: unknown,
) {
  const files: File[] = [];
  for (const [index, media] of results.entries()) {
    const file = await fileFromNativeMedia(media, index, videoEnum);
    if (file) files.push(file);
  }
  return files;
}

export async function pickNativeCommunityPhotos(limit: number) {
  if (limit <= 0 || !canUseNativePhotoPicker()) return null;
  const camera = await import('@capacitor/camera');
  const { Camera, MediaType, MediaTypeSelection } = camera;

  const choose = async (
    options: Parameters<typeof Camera.chooseFromGallery>[0],
  ) => {
    const result = await Camera.chooseFromGallery(options);
    return filesFromGalleryResults(result.results, MediaType.Video);
  };

  try {
    return await choose({
      mediaType: MediaTypeSelection.All,
      allowMultipleSelection: true,
      limit,
    });
  } catch (error) {
    if (isNativePickerCancel(error)) return [];
  }

  try {
    return await choose({
      allowMultipleSelection: true,
      limit,
    });
  } catch (error) {
    if (isNativePickerCancel(error)) return [];
    throw error;
  }
}

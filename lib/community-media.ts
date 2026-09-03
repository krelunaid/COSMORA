export const MAX_COMMUNITY_MEDIA_FILES = 8;
export const MAX_COMMUNITY_MEDIA_BYTES = 25 * 1024 * 1024;

export const COMMUNITY_MEDIA_ACCEPT =
  'image/*,video/*,image/heic,image/heif,image/heic-sequence,image/heif-sequence,.heic,.heif,.mov,.m4v';

const IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/pjpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
]);

const VIDEO_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-m4v',
]);

const EXT_TO_TYPE: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  m4v: 'video/x-m4v',
};

export const COMMUNITY_MEDIA_LIMIT_ERROR =
  'Inserisci fino a 8 foto o video supportati (massimo 25 MB ciascuno).';

export function fileExtension(name: string) {
  return (
    name
      .split('.')
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, '') ?? ''
  );
}

export function communityMediaStorageExtension(file: {
  name: string;
  type: string;
}) {
  const fromName = fileExtension(file.name);
  if (fromName) return fromName;
  if (file.type.startsWith('video/')) return 'mp4';
  if (file.type.includes('png')) return 'png';
  if (file.type.includes('webp')) return 'webp';
  if (file.type.includes('heif')) return 'heif';
  if (file.type.includes('heic')) return 'heic';
  return 'jpg';
}

export function isHeicLike(file: { name: string; type: string }) {
  const type = file.type.toLowerCase();
  if (type.includes('heic') || type.includes('heif')) return true;
  const ext = fileExtension(file.name);
  return ext === 'heic' || ext === 'heif';
}

export function isVideoMedia(file: { name: string; type: string }) {
  if (file.type.toLowerCase().startsWith('video/')) return true;
  return ['mp4', 'webm', 'mov', 'm4v'].includes(fileExtension(file.name));
}

export function sniffCommunityMediaType(header: Uint8Array) {
  if (header.length >= 3 && header[0] === 0xff && header[1] === 0xd8) {
    return 'image/jpeg';
  }
  if (
    header.length >= 8 &&
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47
  ) {
    return 'image/png';
  }
  if (
    header.length >= 12 &&
    header[0] === 0x52 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x46 &&
    header[8] === 0x57 &&
    header[9] === 0x45 &&
    header[10] === 0x42 &&
    header[11] === 0x50
  ) {
    return 'image/webp';
  }
  if (
    header.length >= 12 &&
    header[4] === 0x66 &&
    header[5] === 0x74 &&
    header[6] === 0x79 &&
    header[7] === 0x70
  ) {
    const brand = String.fromCharCode(
      header[8],
      header[9],
      header[10],
      header[11],
    ).toLowerCase();
    if (
      ['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1', 'heif'].includes(
        brand.trim(),
      )
    ) {
      return 'image/heic';
    }
    if (brand.startsWith('qt')) return 'video/quicktime';
    return 'video/mp4';
  }
  return '';
}

export function inferCommunityMediaType(
  file: { name: string; type: string },
  sniff = '',
) {
  const declared = file.type.toLowerCase();
  if (IMAGE_TYPES.has(declared) || VIDEO_TYPES.has(declared)) return declared;
  if (sniff && (IMAGE_TYPES.has(sniff) || VIDEO_TYPES.has(sniff))) return sniff;
  return EXT_TO_TYPE[fileExtension(file.name)] ?? '';
}

export function isAllowedCommunityMediaType(type: string) {
  const normalized = type.toLowerCase();
  return IMAGE_TYPES.has(normalized) || VIDEO_TYPES.has(normalized);
}

export function isAllowedCommunityMediaFile(file: {
  name: string;
  type: string;
  size: number;
}) {
  if (file.size <= 0 || file.size > MAX_COMMUNITY_MEDIA_BYTES) return false;
  return isAllowedCommunityMediaType(inferCommunityMediaType(file));
}

export function communityMediaSelectionError(
  files: Array<{ name: string; type: string; size: number }>,
) {
  if (!files.length || files.length > MAX_COMMUNITY_MEDIA_FILES) {
    return COMMUNITY_MEDIA_LIMIT_ERROR;
  }
  if (files.some((file) => !isAllowedCommunityMediaFile(file))) {
    return COMMUNITY_MEDIA_LIMIT_ERROR;
  }
  return null;
}
